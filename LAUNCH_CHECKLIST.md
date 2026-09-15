# Sukyoo — launch checklist

**Last corrected 2026-08-18.** This file has been wrong twice. It once claimed
everything engineering-side was "built and verified" and that a PGlite test suite
proved the SQL correct — both false, with zero tests and five critical
exploitable holes (see `AUDIT_2026-08.md`). Keep it honest: a checklist that
stops matching reality is worse than no checklist.

**For *how* to ship once these are done, see `GO_LIVE.md`.** This file is the
list of what is still missing.

Current state: **15 migrations, 6 Edge Functions, 155 automated tests**, all
passing, gated in CI. Phases 0–5 of the build plan are complete on the
engineering side. Everything remaining below needs an account, a payment, a
lawyer, or a real device.

---

## Remaining engineering

- [ ] **QR code + deep links for pairing** — the invite code works by typing;
      scanning is not built. Needs `expo-linking` (the `scheme` is already set in
      both `app.config.ts`). Universal Links / App Links additionally need the
      store accounts, so they belong with the iOS work.
- [ ] **Campaign console** — `notification_campaigns` and the opt-out-respecting
      `campaign_audience()` function exist and are tested, but there is no UI and
      no sender. Deliberately absent from the console's navigation until built.
- [ ] **Web path to account deletion** — the in-app path exists in both apps
      (Settings → Privacy & your data). Play additionally requires a web URL.
- [ ] **Delete storage objects on erasure** — `execute_erasure_request()` clears
      every database row but cannot reach Storage, and it returns
      `storage_files_still_to_delete: true` to say so rather than reporting a
      complete erasure. Until that is automated, an erasure is a two-step manual
      process. This is a real gap with a legal deadline attached.
- [ ] **A real video provider** — no provider is wired, on purpose. See
      `docs/CONTENT.md`: a licensed film catalogue contractually requires
      Widevine/FairPlay DRM, which is a paid tier, and choosing between Mux,
      Cloudflare Stream and Bunny is premature with no catalogue to serve.

### Done

- [x] ~~**Security hardening (Phases 0, 2, 3B)**~~ — five critical holes fixed,
      Sentry PII scrubbing, DB-backed rate limits, encrypted session storage,
      screenshot protection, CI scanning. `docs/SECURITY.md`.
- [x] ~~**iOS build configuration (Phase 1)**~~ — typed `app.config.ts` in both
      apps with the explicit `expo-notifications` plugin entry that revives SOS
      and calls on iOS, plus APNs HTTP/2 delivery in the Edge Functions.
      `docs/BUILDING.md`.
- [x] ~~**Admin console (Phases 4A–4D)**~~ — `apps/admin`, mandatory TOTP, 10
      granular roles enforced in Postgres *and* the UI, reason-gated audited
      health reads, and eleven modules: SOS queue, People, Support, Pairings,
      Data requests, Partners, Content, Livestreams, Subscriptions, Releases &
      flags, Audit. `docs/ADMIN.md`.
- [x] ~~**Partners & payouts (4C)**~~ — onboarding pipeline with document expiry,
      server-side telemedicine gating, commission rate cards, two-person payout
      approval, CSV catalogue import with diff preview.
- [x] ~~**Content & livestreams (4B)**~~ — licence windows that auto-hide expired
      titles, RRULE scheduling, kill switch, moderation queue. `docs/CONTENT.md`.
- [x] ~~**DPDP export & erasure (4D)**~~ — in-app request path in both apps,
      two-person approval, an immutable erasure record.
- [x] ~~**Remote config (4D)**~~ — force-upgrade, maintenance mode, banners and
      feature flags, read by both apps at launch, before sign-in.
- [x] ~~**Ship tooling (Phase 5)**~~ — Apple privacy manifests via Expo's own
      `ios.privacyManifests` config (which merges with every dependency's
      manifest at prebuild), tag-driven EAS release workflow with an approval
      gate, `GO_LIVE.md`.

---

## Accounts to create

- [ ] **Supabase project** (dev/staging/prod) — apply `supabase/migrations/*.sql`
      in order. Fill `apps/senior/.env` and `apps/family/.env` from `.env.example`.
- [ ] **Expo / EAS** — `eas init` in both apps. Nothing builds until this is run.
- [ ] **Firebase project** — `google-services.json` per app, plus a service-account
      key as `FCM_SERVICE_ACCOUNT_JSON` on the Edge Functions. **Without this,
      SOS alerts and incoming calls do not work on Android at all.**
- [ ] **Apple Developer Program** — needed only for iOS builds installable on a
      real device; simulator builds work without it. Enrollment takes days to
      weeks, so start early.
- [ ] **APNs auth key** (`.p8`) — `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`.
      iOS device tokens are APNs tokens and cannot be delivered via FCM; see
      `docs/BUILDING.md`.
- [ ] **Agora project** — `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` on `calls-token`.
- [ ] **Razorpay account** — keys on `razorpay-order`, webhook pointed at
      `razorpay-webhook` with `RAZORPAY_WEBHOOK_SECRET`. Needs KYC.
- [ ] **MSG91** (or alternative) — `MSG91_AUTH_KEY` on `sos-escalate`, plus a
      **DLT-registered template id**; SMS silently never worked without one.
- [ ] **Sentry project** — `EXPO_PUBLIC_SENTRY_DSN` in both apps. Safe no-op until set.
- [ ] **Google Play Developer account** — business entity + one-time fee.
- [ ] **Vercel** (or equivalent) for `apps/admin` — free tier, same Supabase
      project, the two `NEXT_PUBLIC_*` vars. **Never set a service-role key on it.**
- [ ] **Ambulance / care-team dispatch partner** — the SOS pipeline's dispatch
      step is an internal ops view until a real integration exists.

---

## Configuration, before real users

- [ ] **Rotate the `service_role` key** — it was exposed in a chat transcript.
- [ ] **Enable `[auth.mfa.totp]`** — the console requires MFA, so this blocks all
      staff access.
- [ ] **Provision the first `super_admin`** — one SQL call; see `docs/ADMIN.md`.
- [ ] **Fix `secure_password_change = false`** — the only auth gap that lets an
      attacker with a stolen session lock the real senior out of their emergency
      app. The full table is in `docs/SECURITY.md` under "Open items".
- [ ] **Set the function secrets**: `ESCALATE_SECRET`, `REMINDERS_SECRET`,
      `MSG91_TEMPLATE_ID`.
- [ ] **Schedule the two cron functions** — `sos-escalate` and
      `livestream-reminders`. SQL snippets are at the bottom of each file.
- [ ] **Seed the catalogue tables** — `supabase/seed.sql`. Without it most shop
      screens render empty and the app looks broken. `content_items` stays empty
      on purpose.
- [ ] **Set a `due_by` policy for data-subject requests** — the statutory period
      is deliberately not hardcoded anywhere; it comes from the reviewed policy.

---

## Legal (needs real review, not a draft)

- [ ] Lawyer review of `legal/PRIVACY_POLICY.md` and `legal/TERMS_OF_SERVICE.md`.
      Health data triggers DPDP Act obligations specifically.
- [ ] Fill the `[bracketed]` placeholders — including the **DPDP-mandated
      grievance officer contact**, which is a hard legal blocker.
- [ ] Publish the reviewed privacy policy at a real URL — Play requires it before
      submission.
- [ ] **Telemedicine Practice Guidelines 2020 compliance review** before paid
      doctor consultations go live. The server-side verification gate exists
      (`book_doctor_slot()` refuses an unverified practitioner); the *process*
      around it has not been reviewed.
- [ ] Confirm the **erasure retention decisions** with counsel — specifically
      that keeping `order_items` for GST line-item detail is defensible against a
      right-to-erasure request. The judgement is written down in migration 0015
      rather than made silently, precisely so it can be challenged.
- [ ] Content licensing for the Entertainment vertical — or leave it in its
      current honest "coming soon" state, which is a legitimate v1.

---

## Before flipping the switch

- [ ] **Commission an external penetration test.** A source-read audit cannot
      substitute; `AUDIT_2026-08.md` §4 says what it specifically cannot tell you.
- [ ] **Verify storage RLS against the real project.** The 155 tests prove the
      SQL is correct, **not** that the deployed project is configured
      identically. Storage policies in particular can only be checked live: do a
      real upload → share → revoke on `health-records`, and confirm a
      `vendor_admin` from another org gets a 404 on `partner-documents`.
- [ ] **Real-device SOS test** from a killed app, and again with Do Not Disturb
      on. The one flow worth hand-verifying every single release.
- [ ] **Cold-start after the SecureStore change** — the session is chunked across
      keys, and a bug there logs everyone out silently on upgrade.
