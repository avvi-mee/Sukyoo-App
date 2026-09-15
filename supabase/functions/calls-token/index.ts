// Dual-mode call signaling + Agora token issuance:
//   { calleeId }       -> starts a new call: creates call_sessions, pushes
//                          an incoming-call alert to the callee, returns the
//                          caller's own token.
//   { callSessionId }  -> fetches a token for an existing session (the
//                          callee answering, or the caller re-fetching).
// Agora tokens are built with uid=0 ("unrestricted") — see the video-calling
// migration's comment; each client also joins with uid 0 and lets the Agora
// SDK auto-assign a real uid, so no Supabase-UUID-to-Agora-uid mapping is needed.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { RtcTokenBuilder, RtcRole } from 'npm:agora-token@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const agoraAppId = Deno.env.get('AGORA_APP_ID')!;
const agoraAppCertificate = Deno.env.get('AGORA_APP_CERTIFICATE')!;

const TOKEN_TTL_SECONDS = 3600;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'missing Authorization header' }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !userData.user) return json({ error: 'not authenticated' }, 401);
    const callerId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    let session;

    if (body.callSessionId) {
      const { data, error } = await admin.from('call_sessions').select('*').eq('id', body.callSessionId).single();
      if (error || !data) return json({ error: 'call session not found' }, 404);
      if (data.caller_id !== callerId && data.callee_id !== callerId) return json({ error: 'not a participant' }, 403);
      session = data;
    } else if (body.calleeId) {
      // AUDIT_2026-08.md §4.5: calleeId was used verbatim with no
      // relationship check. Both apps declare USE_FULL_SCREEN_INTENT and
      // render an incoming call over the lock screen, so this was a remote
      // full-screen-wakeup primitive against arbitrary elderly users.
      const { data: link } = await admin
        .from('family_links')
        .select('id')
        .eq('status', 'active')
        .or(
          `and(senior_id.eq.${callerId},family_member_id.eq.${body.calleeId}),and(senior_id.eq.${body.calleeId},family_member_id.eq.${callerId})`
        )
        .maybeSingle();
      if (!link) return json({ error: 'no active relationship with that user' }, 403);

      const channelName = `call-${crypto.randomUUID()}`;
      const { data, error } = await admin
        .from('call_sessions')
        .insert({ caller_id: callerId, callee_id: body.calleeId, channel_name: channelName })
        .select()
        .single();
      if (error) throw error;
      session = data;

      const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', body.calleeId);
      if (tokens?.length) {
        await sendFcmData(
          tokens.map((t) => t.token),
          { type: 'incoming_call', call_session_id: session.id, channel_name: channelName, caller_id: callerId }
        ).catch((e) => console.error('incoming-call push failed', e));
      }
    } else {
      return json({ error: 'must provide calleeId or callSessionId' }, 400);
    }

    const token = RtcTokenBuilder.buildTokenWithUid(
      agoraAppId,
      agoraAppCertificate,
      session.channel_name,
      0,
      RtcRole.PUBLISHER,
      TOKEN_TTL_SECONDS,
      TOKEN_TTL_SECONDS
    );

    return json({ callSessionId: session.id, channelName: session.channel_name, token, agoraAppId });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// Same FCM HTTP v1 mechanism as sos-trigger — see that function for the
// getGoogleAccessToken implementation. Duplicated rather than shared across
// two Edge Functions since Deno Deploy functions are independently bundled;
// promote to a shared _shared/ module if a third function needs this.
//
// AUDIT_2026-08.md §1.5: this payload had no `apns` block. iOS silently
// drops a data-only FCM message that lacks `apns-push-type: background` +
// `content-available: 1` — the blocker on incoming calls reaching iOS was
// never the notification library, it was this.
async function sendFcmData(tokens: string[], data: Record<string, unknown>) {
  const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) {
    console.warn('FCM_SERVICE_ACCOUNT_JSON not set — skipping push send');
    return;
  }
  const { SignJWT, importPKCS8 } = await import('npm:jose@5');
  const serviceAccount = JSON.parse(serviceAccountJson);
  const key = await importPKCS8(serviceAccount.private_key, 'RS256');
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setExpirationTime('1h')
    .sign(key);
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const { access_token } = await tokenRes.json();

  const stringData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));
  await Promise.all(
    tokens.map((deviceToken) =>
      fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            data: stringData,
            android: { priority: 'high' },
            apns: {
              headers: { 'apns-push-type': 'background', 'apns-priority': '5' },
              payload: { aps: { 'content-available': 1 } },
            },
          },
        }),
      })
    )
  );
}
