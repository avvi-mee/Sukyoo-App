# Going live

Written 2026-08-18, after Phases 0–5. This is the runbook for the first real
release and every one after it. `LAUNCH_CHECKLIST.md` tracks *what is still
missing*; this file is *how to ship once it isn't*.

**Android first. iOS is build-only** — it must compile on EAS, but nothing is
submitted to the App Store until the Apple Developer account and the APNs key
exist.

---

## Before the first release, in order

These are blocking. Each one, skipped, produces a specific broken behaviour
rather than a vague risk.

| # | Step | What breaks without it |
|---|---|---|
| 1 | **Rotate the `service_role` key** | It was pasted into a chat transcript. Anyone holding it bypasses every RLS policy in this repo. |
| 2 | **Apply all 15 migrations, in order** | Every security fix from Phase 0 onward is inert. |
| 3 | **Redeploy all six Edge Functions** | Same. The rate limiters and the redaction live there. |
| 4 | **Set every function secret** | `ESCALATE_SECRET` (sos-escalate returns 403 without it), `REMINDERS_SECRET`, `MSG91_TEMPLATE_ID`, FCM + APNs credentials. |
| 5 | **Enable `[auth.mfa.totp]`** | No staff can sign in to the console at all — it requires `aal2`. |
| 6 | **Provision the first `super_admin`** | Nothing in the console is reachable. One SQL call; see `docs/ADMIN.md`. |
| 7 | **Fix `secure_password_change = false`** | A stolen session can change the password and lock the real senior out of their emergency app. |
| 8 | **`eas init` in both apps** | `appVersionSource: "remote"` needs the project id. Nothing builds. |
| 9 | **Firebase project + `google-services.json`** | No FCM token, so **no SOS alerts and no incoming calls on Android**. The release workflow fails a production build without it, deliberately. |
| 10 | **Publish the reviewed privacy policy at a real URL** | Play Console will not accept the submission. |
| 11 | **Fill the `[bracketed]` placeholders in `legal/`** | Includes the **DPDP-mandated grievance officer contact**, which is a hard legal blocker. |
| 12 | **Set a `due_by` policy for data requests** | The console shows every open request as undated. The statutory period is deliberately not hardcoded — it comes from the reviewed policy, not from a guess in a migration. |
| 13 | **Commission an external penetration test** | A source-read audit cannot substitute for one. See `AUDIT_2026-08.md` §4. |
| 14 | **Seed the catalogue tables** | Most shop screens render empty and the app looks broken. `supabase/seed.sql`. |

`content_items` stays empty on purpose — see `docs/CONTENT.md`. Both apps show
an honest "opening soon" state rather than film titles Sukyoo has no rights to.

---

## Releasing

### 1. Cut the tag

```bash
# Bump `version` in apps/senior/app.config.ts first — the workflow fails if the
# tag and the config disagree, because a mismatch silently breaks Sentry's
# release matching and makes the store listing lie.
git tag senior-v1.0.0
git push origin senior-v1.0.0
```

`family-v*` does the same for the family app. Two apps in one repo is why the
tag carries the name: a bare `v1.0.0` would build both and burn EAS minutes on
the one that did not change.

The workflow re-runs typecheck and the full test suite before building. That is
not redundant with CI — a tag can point at a commit that never opened a PR.

### 2. Approve the submission

The `submit` job waits on the `play-internal` GitHub environment. Name the
reviewers in repo settings. Uploading to Play is the first irreversible step in
the pipeline, so it gets a human rather than happening because a tag was pushed.

### 3. Test on the internal track

Install from the internal track on a **real device**, not an emulator, and check
the four things that only fail on real hardware:

1. **SOS from a killed app.** Force-stop the family app, trigger an SOS from the
   senior app, confirm the full-screen alert appears over the lock screen. This
   is the one flow worth hand-verifying on every release — the whole product
   rests on it and it depends on native behaviour no test reaches.
2. **SOS with the phone in Do Not Disturb.** Same, with DND on.
3. **Incoming video call** with the app backgrounded.
4. **Session survives a cold start.** The SecureStore adapter chunks the session
   across keys; a bug there logs everyone out silently on upgrade.

### 4. Staged rollout

Promote from internal to production in Play Console at **5% → 20% → 50% → 100%**,
holding at least 24 hours at each step.

Hold longer than 24 hours if any of these move:

- Crash-free sessions below **99.5%**
- Any Sentry issue tagged `sos` or `calls`, at any volume
- `sos_notifications` showing a rising share of zero-delivery events — visible on
  the console's SOS queue as "Family reached: 0"
- Support tickets marked **urgent** (the queue sorts them to the top)

### 5. If something is wrong

**Halting a Play rollout does not help the people who already updated.** Reach
for the remote kill switches first — they take effect at the next app launch,
with no store review and no waiting.

| Situation | Do this |
|---|---|
| A feature is broken but the app works | `/releases` → turn its **feature flag** off. Seconds, no rollout change. |
| The new build is broken; the old one is fine | Play Console → **halt the rollout**, then `/releases` → set **minimum version** to the last good build so updaters are pushed back. |
| Data incident, or the app is actively unsafe | `/releases` → **maintenance mode**, with a message. Then work the incident. |
| Something needs saying but not blocking | `/releases` → **banner**, severity `warning` or `critical`. |

**Maintenance mode locks users out of the SOS button.** Both apps say so on the
lock-out screen and point at 108. Use it for a data incident or a genuinely
unsafe build — not for a slow API.

Every one of these writes to the audit trail with the reason you typed. The RPC
refuses a reason under 10 characters, so "why was the app down on the 14th" has
an answer without asking anyone.

---

## Play Console, per listing

Both apps need their own listing. Repeat everything.

- **Data Safety form** — answer key is `legal/PLAY_STORE_DATA_SAFETY.md`, already
  complete. It must match `ios.privacyManifests` in each `app.config.ts`,
  because the same facts drive both and a regulator comparing them will notice.
- **Health apps declaration** — Play treats health data as sensitive. Expect a
  longer review and questions about the SOS location permission.
- App icon, screenshots, listing copy, content rating questionnaire.
- **Account deletion URL** — Play requires a web path to account deletion as well
  as the in-app one. The in-app path exists (Settings → Privacy & your data);
  the web equivalent still has to be published.

### Review notes — write these in the submission

Reviewers reject what they cannot explain. Say it first:

> Sukyoo is a care app for elderly users in India. Three behaviours look unusual
> and are deliberate:
>
> 1. **Full-screen notification over the lock screen** (`USE_FULL_SCREEN_INTENT`).
>    The companion app must wake a sleeping family member when their parent
>    triggers an emergency alert. It is used only for SOS and incoming calls —
>    never for marketing.
> 2. **Location on an emergency alert.** Location is requested when-in-use and is
>    attached only to an SOS event, so responders can find the person. It is not
>    collected in the background and not used for anything else.
> 3. **Two apps, one account system.** The senior app and the family app are
>    separate listings that pair to each other. The family app shows health data
>    only after the senior explicitly grants it, per category, and the senior can
>    withdraw any grant at any time.

---

## After every release

- Watch crash-free sessions and the SOS queue for 48 hours.
- Confirm the **audit trail** shows the release change with your reason on it.
- Move the tag's notes into `LAUNCH_CHECKLIST.md` if anything turned out to be
  missing. A checklist that stops matching reality is worse than none — the last
  one asserted a test suite that did not exist, and that mistake cost more than
  writing the tests would have.
