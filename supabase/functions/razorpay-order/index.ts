// Creates a Razorpay Order for an existing Sukyoo order and a `payments`
// row to track it, then hands the client just enough to open the native
// checkout SDK. This does NOT mark anything paid — only razorpay-webhook,
// reacting to Razorpay's own server-to-server callback, is trusted for that.
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')!;
const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'missing Authorization header' }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !userData.user) return json({ error: 'not authenticated' }, 401);
    const callerId = userData.user.id;

    const { orderId } = await req.json();
    const { data: order, error: orderError } = await admin.from('orders').select('*').eq('id', orderId).single();
    if (orderError || !order) return json({ error: 'order not found' }, 404);
    if (order.belongs_to_user_id !== callerId && order.ordered_by_user_id !== callerId && order.payer_user_id !== callerId) {
      return json({ error: 'not a participant on this order' }, 403);
    }
    if (order.status !== 'pending') {
      return json({ error: `order is already ${order.status}` }, 409);
    }

    // Idempotency: a retry (network blip, double-tap) reuses the existing
    // Razorpay order rather than creating a second one — without this, a
    // paid order could accumulate a duplicate `payments` row per invocation.
    const { data: existingPayment } = await admin
      .from('payments')
      .select('*')
      .eq('order_id', order.id)
      .neq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingPayment?.razorpay_order_id) {
      return json({
        razorpayOrderId: existingPayment.razorpay_order_id,
        amount: Math.round(Number(existingPayment.amount) * 100),
        currency: 'INR',
        razorpayKeyId,
      });
    }

    const amountPaise = Math.round(Number(order.subtotal) * 100);
    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: order.id }),
    });
    const rpOrder = await rpRes.json();
    if (!rpRes.ok) return json({ error: rpOrder.error?.description ?? 'Razorpay order creation failed' }, 502);

    await admin.from('payments').insert({
      order_id: order.id,
      payer_user_id: order.payer_user_id,
      razorpay_order_id: rpOrder.id,
      amount: order.subtotal,
    });

    return json({ razorpayOrderId: rpOrder.id, amount: amountPaise, currency: 'INR', razorpayKeyId });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
