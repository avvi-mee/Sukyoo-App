# Sukyoo — Play Store launch checklist

Everything engineering-side is built and verified (schema, RLS, both apps,
all four verticals). What's left is account setup and business steps only
you can do — nothing here is blocked on more code.

## Accounts to create

- [ ] **Supabase project** (dev/staging/prod) — apply `supabase/migrations/*.sql` in order, either via `npx supabase db push` after `supabase link`, or paste each file into the SQL editor. Fill in `apps/senior/.env` and `apps/family/.env` from `.env.example`.
- [ ] **Firebase project** — for push notifications (SOS alerts, incoming calls). Download `google-services.json` for Android, add via `googleServicesFile` in each app's `app.json`. Generate a service-account key → set as the `FCM_SERVICE_ACCOUNT_JSON` secret on the `sos-trigger` and `calls-token` Supabase Edge Functions.
- [ ] **Agora project** — get an App ID + App Certificate → set as `AGORA_APP_ID`/`AGORA_APP_CERTIFICATE` secrets on `calls-token`.
- [ ] **Razorpay account** — get Key ID/Secret → set as `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` on `razorpay-order`; configure a webhook pointing at `razorpay-webhook` and set `RAZORPAY_WEBHOOK_SECRET`.
- [ ] **MSG91 account** (or alternative) — for SOS SMS/WhatsApp fallback → set `MSG91_AUTH_KEY` on `sos-escalate`, and schedule that function via `pg_cron` (SQL snippet at the bottom of `supabase/functions/sos-escalate/index.ts`).
- [ ] **Sentry project** (optional but recommended) — set `EXPO_PUBLIC_SENTRY_DSN` in both apps' `.env` to turn on crash reporting; it's a safe no-op until then.
- [ ] **Google Play Developer account** — needs a business entity + one-time fee.
- [ ] **Ambulance/care-team dispatch partner** — the SOS pipeline's dispatch step is an internal ops view until a real partner integration exists (see `care_dispatch` table).

## Legal (needs real review, not just my draft)

- [ ] Have a lawyer review `legal/PRIVACY_POLICY.md` and `legal/TERMS_OF_SERVICE.md` — health data specifically triggers DPDP Act obligations. Fill in the `[bracketed]` placeholders (grievance officer contact, retention periods, liability terms).
- [ ] Publish the reviewed privacy policy at a real URL — Play Console requires this before submission.
- [ ] Get a Telemedicine Practice Guidelines 2020 compliance review before real doctor consultations go live for money.
- [ ] Close content-licensing deals for the Entertainment vertical (or leave it in its current "coming soon" state — that's a legitimate v1, not a bug).

## Play Console, per app (repeat for both listings)

- [ ] Fill in the Data Safety form using `legal/PLAY_STORE_DATA_SAFETY.md` as the answer key.
- [ ] App icon, screenshots, store listing copy, content rating questionnaire.
- [ ] `eas build --platform android --profile production` (needs an Expo account + EAS project linked — `eas init` creates one).
- [ ] `eas submit --platform android` or upload the `.aab` manually to Play Console's internal testing track first.

## Before flipping the switch on payments/health features for real users

- [ ] Test the RLS/permission-grant flow against the real Supabase project, not just the local PGlite test suite — the suite proves the SQL is correct, not that the deployed project is configured identically (phone-auth SMS provider enabled). Storage buckets (`health-records`, `life-stories`) are created by migration `20260813192053_storage_buckets.sql`, but that migration's storage-RLS policies can only be verified against a real project — do a real upload+share+revoke test after deploying.
- [ ] Real-device test the SOS full-screen alert specifically, with the family app backgrounded and then fully killed — this is the one flow worth hand-verifying every time it's touched (see the build plan's verification section).
