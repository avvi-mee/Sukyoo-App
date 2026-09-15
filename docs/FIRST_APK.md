# Getting the first Android APK onto a phone

Written 2026-08-19. The shortest correct path from this repo to an installed,
working app. Play Store and App Store come later — this is a real APK you
sideload.

**Everything code-side is done and verified**: 15 migrations, 162 automated
tests passing, both apps clean on 21/21 `expo-doctor` checks. What is left needs
two logins that only you can do, one Google project, and about an hour.

Do the steps in order. Each one says what breaks if you skip it.

---

## Step 0 — Two logins (only you can do these)

I cannot run these: they need your password, and entering your credentials is
not something I do.

```bash
npx supabase login          # opens a browser
npx eas-cli login           # Expo account — create one free if you have none
```

Verify both:

```bash
npx supabase projects list  # should list "sukyoo App"
npx eas-cli whoami          # should print your username
```

---

## Step 1 — Get the database up to date

Your project currently has the **first 7 migrations** applied, because they were
pasted into the SQL Editor by hand. The 8 newer ones are not applied — which
means every security fix from 2026-08-17 onward, the admin console schema, the
partner gating and the DPDP tables are all missing from the live database.

The SQL Editor does not record what it has run, so the CLI does not know those 7
are already done. Tell it, then push the rest.

```bash
npx supabase link --project-ref xonnvecdgqutvusncxuw
```

**First, check what it thinks is applied:**

```bash
npx supabase migration list
```

Mark the 7 that were pasted manually as already applied:

```bash
npx supabase migration repair --status applied 20260813133216
npx supabase migration repair --status applied 20260813144243
npx supabase migration repair --status applied 20260813152103
npx supabase migration repair --status applied 20260813161010
npx supabase migration repair --status applied 20260813165709
npx supabase migration repair --status applied 20260813185042
npx supabase migration repair --status applied 20260813192053
```

Then apply the remaining 8:

```bash
npx supabase db push
```

Run `npx supabase migration list` again — all 15 should show as applied both
locally and remotely.

> **If `db push` errors** with "already exists", one of those 7 was not actually
> applied, or an 8th was. Send me the error and I will work out which. Do not
> start deleting things to make it pass.

**If you would rather start clean** — there is no real user data yet, so this is
a legitimate option and it is the simplest: in the dashboard, run
`drop schema public cascade; create schema public;` plus
`drop trigger if exists on_auth_user_created on auth.users;`, then
`npx supabase db push` applies all 15 in order with nothing to repair. Tell me
first if you want this and I will give you the exact statements — the trigger
lives outside `public`, which is what tripped this up last time.

### Then seed the catalogue

```bash
npx supabase db push --include-seed
```

Or paste `supabase/seed.sql` into the SQL Editor. Either is fine — the seed is
idempotent, so running it twice does not duplicate anything.

**Skip this and the app looks broken.** The shop, doctors, diagnostics and home
care all render their (correct) empty state, and it reads as a bug.

> I found and fixed a real bug here today: the seed set `is_verified` on the
> partner organisations but not `onboarding_status`, so migration 0012's
> catalogue gating hid every seeded product and doctor. All the rows were in the
> database and none of them were visible. `supabase/tests/seed.test.mjs` now
> asserts a senior can actually *see* the catalogue, which is the only way to
> catch that class of problem.

### One dashboard setting

**Authentication → Providers → Email → turn OFF "Confirm email".**

`supabase/config.toml` already has `enable_confirmations = false`, but that file
only governs local development — the hosted project has its own setting and it
defaults to ON. Leave it on and sign-up returns no session: you fill in the form,
nothing happens, and you are stuck on the login screen with no error.

---

## Step 2 — Firebase, or there are no SOS alerts

The APK **will build and run without this**. What will not work is push — which
means **no SOS alerts and no incoming call notifications**. That is the core of
the product, so treat it as required rather than optional.

1. <https://console.firebase.google.com> → **Add project** (name it Sukyoo).
2. Add an **Android app**. Package name must be exactly `com.sukyoo.senior`.
3. Download `google-services.json` → save it to `apps/senior/google-services.json`.
4. **Add a second Android app** in the *same* Firebase project, package name
   `com.sukyoo.family`. Download that `google-services.json` → save to
   `apps/family/google-services.json`.
5. Project settings → **Service accounts** → *Generate new private key*. Keep
   the JSON — it goes on the Edge Functions next.

Both files are gitignored, so they will not be committed. They do reach the
build, via `.easignore`.

### Put the server-side secrets in place

```bash
npx supabase secrets set FCM_SERVICE_ACCOUNT_JSON="$(cat path/to/service-account.json)"
npx supabase secrets set ESCALATE_SECRET="$(openssl rand -hex 32)"
npx supabase secrets set REMINDERS_SECRET="$(openssl rand -hex 32)"
```

Then deploy the functions:

```bash
npx supabase functions deploy sos-trigger
npx supabase functions deploy calls-token
npx supabase functions deploy sos-escalate
npx supabase functions deploy razorpay-order
npx supabase functions deploy razorpay-webhook
npx supabase functions deploy livestream-reminders
```

Agora, Razorpay and MSG91 secrets can wait — video calling, payments and the SMS
fallback stay unavailable until they are set, and everything else works. **FCM
cannot wait**: without it the SOS button does nothing visible on the other phone.

---

## Step 3 — Create the EAS projects

```bash
cd "E:/Sukyoo App/apps/senior" && npx eas-cli init
cd "E:/Sukyoo App/apps/family" && npx eas-cli init
```

This writes `extra.eas.projectId` into each `app.config.ts`. Nothing builds
before it: `eas.json` sets `appVersionSource: "remote"`, which needs the project
to exist on Expo's side.

---

## Step 4 — Build the APKs

```bash
cd "E:/Sukyoo App/apps/senior"
npx eas-cli build --platform android --profile preview
```

The `preview` profile is `buildType: "apk"` with internal distribution — an APK
you can download and sideload, not an `.aab` that only Play can open.

First build takes 15–25 minutes on the free tier. EAS prints a URL; the APK is
downloadable from it when the build finishes.

Then the same for `apps/family`.

> **On credentials**: EAS will offer to generate an Android keystore. Say yes and
> let it manage it. Losing that keystore later means you cannot ship an update to
> the same Play listing, ever — so let Expo hold it rather than a file on this
> machine.

### What I already fixed that would have broken this

Two things, both of which produce a build that *succeeds* and an app that fails:

- **`.env` was gitignored, and EAS respects `.gitignore` when uploading.** The
  Supabase URL and anon key would have been `undefined` at build time, and the
  app would have crashed the instant it launched, every time, with nothing in the
  build log to explain it. There is now a `.easignore` that uploads `.env`, plus
  a guard in both `app.config.ts` files that **fails the build** rather than
  shipping a crashing APK if the variables are ever missing again.
- **The seed bug above**, which would have made every catalogue screen blank.

---

## Step 5 — Install and check it actually works

Download the APK to the phone and open it. Android will warn about installing
from an unknown source; allow it.

Test in this order — each step depends on the one before:

1. **Sign up** in the senior app. If nothing happens, the "Confirm email" setting
   in Step 1 is still on.
2. **Look around.** Shop, doctors, diagnostics and home care should all have
   content. If any is empty, the seed did not run.
3. **Install the family app** on a second phone (or the same one — both can be
   installed together, they are separate packages). Sign up as a family member.
4. **Pair them.** Senior app → Settings → Family & sharing → generate a code.
   Type it into the family app. The code is 15-minute, single-use, and rate
   limited — that is deliberate.
5. **Grant a permission.** From the senior app, share one category. Confirm it
   appears in the family app and nothing else does.
6. **The SOS test.** This is the one that matters. **Force-stop the family app**
   from Android settings, then hold the SOS button in the senior app. A
   full-screen alert should appear on the family phone over the lock screen.

**If step 6 fails, tell me before doing anything else.** It is the whole product,
it depends on native behaviour no automated test can reach, and the cause is
usually one of three specific things I can narrow down from what you saw.

---

## What still will not work, and why

Not bugs — unset accounts:

| Feature | Needs |
|---|---|
| Video calls | Agora app id + certificate on `calls-token` |
| Paying for anything | Razorpay account and KYC |
| SMS fallback if nobody answers an SOS | MSG91 with a DLT-registered template |
| Crash reports | A Sentry project (`EXPO_PUBLIC_SENTRY_DSN`) |
| Films, music, audiobooks | Content licensing. Deliberately empty — see `docs/CONTENT.md` |
| The ops console | Deploy `apps/admin`, enable TOTP, provision an admin (`docs/ADMIN.md`) |

---

## One thing to do regardless

**Rotate the `service_role` key.** It was pasted into a chat transcript, and
anyone holding it bypasses every row-level security policy in this project —
every senior's health record, readable. Dashboard → Settings → API → roll it, and
update any Edge Function or server that used the old one.

This does not block the APK. It does block having real users.
