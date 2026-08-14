// Emergency SOS fan-out. Invoked by the senior app's hold-to-confirm button.
// Runs with the service_role key (bypasses RLS by design — see the RLS
// notes in 0002_health_and_sos.sql: clients never insert sos_events directly).
//
// Deploy: npx supabase functions deploy sos-trigger
// Secrets needed: FCM_SERVICE_ACCOUNT_JSON (a Firebase service-account key,
// for FCM HTTP v1 push — see sendFcmPush below).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { SignJWT, importPKCS8 } from 'npm:jose@5';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'missing Authorization header' }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !userData.user) return json({ error: 'not authenticated' }, 401);
    const seniorId = userData.user.id;

    const { latitude, longitude } = await req.json().catch(() => ({}));

    const { data: sosEvent, error: sosError } = await admin
      .from('sos_events')
      .insert({ senior_id: seniorId, latitude: latitude ?? null, longitude: longitude ?? null })
      .select()
      .single();
    if (sosError) throw sosError;

    const { data: familyLinks } = await admin
      .from('family_links')
      .select('family_member_id')
      .eq('senior_id', seniorId)
      .eq('status', 'active');

    const recipientIds = (familyLinks ?? []).map((l) => l.family_member_id);

    const { data: tokens } = recipientIds.length
      ? await admin.from('push_tokens').select('user_id, token').in('user_id', recipientIds)
      : { data: [] as { user_id: string; token: string }[] };

    // One sos_notifications row per recipient/channel — this IS the
    // delivery-tracking + audit trail for this flow (see 0002's comments).
    const notificationRows = recipientIds.map((recipientId) => ({
      sos_event_id: sosEvent.id,
      recipient_id: recipientId,
      channel: 'push',
    }));
    if (notificationRows.length) {
      await admin.from('sos_notifications').insert(notificationRows);
    }
    // Generic care-team channel row, no specific recipient — an ops view
    // reads sos_events/care_dispatch directly (no confirmed dispatch
    // partner yet, see the plan's non-engineering dependencies).
    await admin.from('sos_notifications').insert({ sos_event_id: sosEvent.id, recipient_id: null, channel: 'care_team' });

    if (tokens?.length) {
      await sendFcmPush(
        tokens.map((t) => t.token),
        { title: 'Emergency SOS', body: 'A family member needs help now.', data: { type: 'sos', sos_event_id: sosEvent.id } }
      ).catch((e) => console.error('FCM push failed', e));
    }

    return json({ sos_event_id: sosEvent.id });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// FCM HTTP v1 push via a Firebase service account. Data-only payload (no
// `notification` field) so the family app's background handler — not the OS
// default tray — decides how to render this (Notifee full-screen alert).
async function sendFcmPush(tokens: string[], payload: { title: string; body: string; data: Record<string, string> }) {
  const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) {
    console.warn('FCM_SERVICE_ACCOUNT_JSON not set — skipping push send');
    return;
  }
  const serviceAccount = JSON.parse(serviceAccountJson);
  const accessToken = await getGoogleAccessToken(serviceAccount);

  await Promise.all(
    tokens.map((token) =>
      fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token,
            data: { ...payload.data, title: payload.title, body: payload.body },
            android: { priority: 'high' },
          },
        }),
      })
    )
  );
}

async function getGoogleAccessToken(serviceAccount: { client_email: string; private_key: string }) {
  const key = await importPKCS8(serviceAccount.private_key, 'RS256');
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setExpirationTime('1h')
    .sign(key);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const { access_token } = await res.json();
  return access_token as string;
}
