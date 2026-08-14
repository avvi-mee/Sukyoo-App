// The one source of truth for "did this payment actually go through" — the
// client's checkout success callback is never trusted directly (see the
// razorpay-order function's header comment). Idempotent by construction:
// commission_ledger has a unique (source_type, source_id) constraint, so a
// retried webhook delivery for the same order is a no-op on the second call.
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');
  if (!signature || !(await verifySignature(rawBody, signature, webhookSecret))) {
    return new Response('invalid signature', { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const admin = createClient(supabaseUrl, serviceRoleKey);

  if (event.event === 'payment.captured') {
    const rpPayment = event.payload.payment.entity;
    const { data: payment } = await admin
      .from('payments')
      .update({ status: 'captured', razorpay_payment_id: rpPayment.id, method: rpPayment.method })
      .eq('razorpay_order_id', rpPayment.order_id)
      .select()
      .single();

    if (payment) {
      await admin.from('orders').update({ status: 'paid' }).eq('id', payment.order_id);
      await recordCommission(admin, payment.order_id, Number(payment.amount));
    }
  } else if (event.event === 'payment.failed') {
    const rpPayment = event.payload.payment.entity;
    await admin.from('payments').update({ status: 'failed' }).eq('razorpay_order_id', rpPayment.order_id);
  }

  return new Response('ok', { status: 200 });
});

async function verifySignature(body: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex === signature;
}

// # ponytail: one commission row per order using the first line item's
// vendor rate (most orders are single-vendor or Sukyoo-direct) — add
// per-vendor split commission only if multi-vendor orders actually happen.
async function recordCommission(admin: ReturnType<typeof createClient>, orderId: string, grossAmount: number) {
  const { data: firstItem } = await admin
    .from('order_items')
    .select('product:products(vendor_org_id)')
    .eq('order_id', orderId)
    .limit(1)
    .maybeSingle();

  let rate = 0;
  let vendorOrgId: string | null = null;
  const vendorOrg = (firstItem as { product?: { vendor_org_id: string | null } } | null)?.product?.vendor_org_id;
  if (vendorOrg) {
    vendorOrgId = vendorOrg;
    const { data: org } = await admin.from('organizations').select('default_commission_rate').eq('id', vendorOrg).single();
    rate = Number(org?.default_commission_rate ?? 0);
  }

  await admin
    .from('commission_ledger')
    .upsert(
      {
        source_type: 'order',
        source_id: orderId,
        gross_amount: grossAmount,
        commission_amount: Math.round(grossAmount * (rate / 100) * 100) / 100,
        rate_snapshot: rate,
        partner_org_id: vendorOrgId,
      },
      { onConflict: 'source_type,source_id', ignoreDuplicates: true }
    );
}
