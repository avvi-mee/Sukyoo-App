// Runs on a schedule (Supabase Cron, every ~20-30s) against still-open SOS
// events. Escalates to SMS/WhatsApp via MSG91 after a grace window if no
// family member has acked the push yet.
//
// Deploy: npx supabase functions deploy sos-escalate
// Schedule (SQL, run once against the project): see bottom of this file.
// Secrets needed: MSG91_AUTH_KEY, ESCALATE_SECRET, MSG91_TEMPLATE_ID.
import { createClient } from 'npm:@supabase/supabase-js@2';

const GRACE_WINDOW_SECONDS = 60;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const escalateSecret = Deno.env.get('ESCALATE_SECRET')!;

Deno.serve(async (req) => {
  // This function used to ignore the request entirely (AUDIT_2026-08.md
  // §4.4) — any caller could drive paid SMS and burn each event's one
  // escalation attempt early, silently disarming the fallback. It's invoked
  // by pg_cron, not a signed-in user, so it's gated on a shared secret
  // (config.toml sets verify_jwt = false for this function) rather than a
  // Supabase JWT.
  if (req.headers.get('x-escalate-secret') !== escalateSecret) {
    return json({ error: 'not authorized' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const cutoff = new Date(Date.now() - GRACE_WINDOW_SECONDS * 1000).toISOString();

  const { data: openEvents, error } = await admin
    .from('sos_events')
    .select('*, sos_notifications(*)')
    .eq('status', 'triggered')
    .lt('triggered_at', cutoff);
  if (error) return json({ error: error.message }, 500);

  let escalated = 0;
  for (const event of openEvents ?? []) {
    const pushNotifications = (event.sos_notifications ?? []).filter((n: { channel: string }) => n.channel === 'push');
    const anyAcked = pushNotifications.some((n: { acked_at: string | null }) => n.acked_at);
    if (anyAcked) continue; // someone already saw it — no need to escalate

    const alreadyEscalated = (event.sos_notifications ?? []).some((n: { channel: string }) => n.channel === 'sms' || n.channel === 'whatsapp');
    if (alreadyEscalated) continue;

    const recipientIds = pushNotifications.map((n: { recipient_id: string }) => n.recipient_id).filter(Boolean);
    if (!recipientIds.length) continue;

    const { data: contacts } = await admin.from('profiles').select('id, phone').in('id', recipientIds);

    for (const contact of contacts ?? []) {
      if (!contact.phone) continue;
      await sendSms(contact.phone, 'Sukyoo emergency alert: your family member needs help. Open the Sukyoo Family app now.');
      await admin.from('sos_notifications').insert({ sos_event_id: event.id, recipient_id: contact.id, channel: 'sms' });
    }
    escalated++;
  }

  return json({ checked: openEvents?.length ?? 0, escalated });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function sendSms(phone: string, message: string) {
  const authKey = Deno.env.get('MSG91_AUTH_KEY');
  const templateId = Deno.env.get('MSG91_TEMPLATE_ID');
  if (!authKey || !templateId) {
    console.warn('MSG91_AUTH_KEY / MSG91_TEMPLATE_ID not set — skipping SMS send');
    return;
  }
  // The /flow/ endpoint expects a DLT-registered template_id + a recipients
  // array, not the {mobiles, message} shape this previously sent — the SOS
  // SMS fallback silently never worked (AUDIT_2026-08.md §4.12).
  await fetch('https://api.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { authkey: authKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_id: templateId,
      recipients: [{ mobiles: phone, message }],
    }),
  });
}

// Schedule this function from the Supabase SQL editor once deployed. The
// secret goes in the header this function checks above, never a
// service-role key (cron.job rows are queryable, so keep the powerful key
// out of them entirely).
//
// select cron.schedule(
//   'sos-escalate-every-30s',
//   '30 seconds',
//   $$ select net.http_post(
//     url := '<your-project>.supabase.co/functions/v1/sos-escalate',
//     headers := jsonb_build_object('x-escalate-secret', '<ESCALATE_SECRET value>')
//   ) $$
// );
