// Runs on a schedule (Supabase Cron, every ~20-30s) against still-open SOS
// events. Escalates to SMS/WhatsApp via MSG91 after a grace window if no
// family member has acked the push yet.
//
// Deploy: npx supabase functions deploy sos-escalate
// Schedule (SQL, run once against the project): see bottom of this file.
// Secrets needed: MSG91_AUTH_KEY.
import { createClient } from 'npm:@supabase/supabase-js@2';

const GRACE_WINDOW_SECONDS = 60;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async () => {
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
  if (!authKey) {
    console.warn('MSG91_AUTH_KEY not set — skipping SMS send');
    return;
  }
  await fetch('https://api.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { authkey: authKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobiles: phone, message }),
  });
}

// Schedule this function from the Supabase SQL editor once deployed:
//
// select cron.schedule(
//   'sos-escalate-every-30s',
//   '30 seconds',
//   $$ select net.http_post(
//     url := '<your-project>.supabase.co/functions/v1/sos-escalate',
//     headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
//   ) $$
// );
