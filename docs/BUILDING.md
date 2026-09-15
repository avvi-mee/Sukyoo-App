# Building Sukyoo

Two Expo apps, one codebase each for Android and iOS: `apps/senior` and
`apps/family`. Both use Expo's Continuous Native Generation — there is no
checked-in `ios/` or `android/` directory, and you should not create one. EAS
regenerates them on every build.

This machine is Windows. **iOS cannot be prebuilt or compiled locally** —
`npx expo prebuild --platform ios` refuses to run outside macOS/Linux. iOS
builds go through EAS's hosted macOS builders, which is the supported path from
Windows and needs no Mac.

---

## Before your first build

### 1. Expo account and EAS project

```bash
npm i -g eas-cli
eas login
cd apps/senior  && eas init      # writes extra.eas.projectId + owner
cd ../family    && eas init
```

`eas.json` sets `appVersionSource: "remote"`, so EAS owns the version/build
number. Without `eas init` there is no project for it to own and every build
fails immediately.

### 2. Firebase — required for Android push

Push is not a nice-to-have here: **SOS alerts and incoming calls are the
product**, and both ride on it.

1. Create a Firebase project, add an Android app for each package name
   (`com.sukyoo.senior`, `com.sukyoo.family`).
2. Download each `google-services.json` into the matching app directory.
3. Generate a service-account key → set as the `FCM_SERVICE_ACCOUNT_JSON`
   secret on the `sos-trigger` and `calls-token` Edge Functions.

`app.config.ts` only sets `android.googleServicesFile` when the file exists, so
the repo stays clonable without it — but a build without it produces an app that
can never receive an SOS. A warning is printed during EAS builds when it's
missing.

### 3. Apple — required only for iOS *device* builds

The `preview` profile builds an **iOS simulator** binary, which needs no Apple
account. That is enough to prove the project compiles.

Anything installable on a real iPhone (`preview:device`, `production`) requires
a paid Apple Developer Program membership. Enrollment can take days to weeks —
company enrollment needs a D-U-N-S number — so start it well before you need it.
EAS generates and stores the signing credentials for you once the account
exists.

For iOS push you additionally need an **APNs auth key** (`.p8`) from the Apple
Developer portal, set on the Edge Functions as:

- `APNS_KEY_ID` — the key's 10-character id
- `APNS_TEAM_ID` — your Apple team id
- `APNS_PRIVATE_KEY` — the full contents of the `.p8` file
- `APNS_USE_SANDBOX` — `true` for development builds, unset/`false` for production

**Why iOS needs its own push path.** `expo-notifications`'
`getDevicePushTokenAsync()` returns an FCM registration token on Android but a
*raw APNs device token* on iOS. FCM HTTP v1 rejects an APNs token passed as
`message.token`, so iOS rows in `push_tokens` cannot be delivered through FCM at
all. `supabase/functions/_shared/push.ts` branches on `push_tokens.platform` and
talks to APNs directly. The alternative — adding
`@react-native-firebase/messaging` so iOS also yields an FCM token — forces
`useFrameworks: 'static'` and fights `expo-notifications`, so it was rejected.

### 4. Other Edge Function secrets

| Secret | Function | Consequence if unset |
|---|---|---|
| `FCM_SERVICE_ACCOUNT_JSON` | `sos-trigger`, `calls-token` | Android push silently reports undelivered |
| `APNS_*` (above) | `sos-trigger`, `calls-token` | iOS push silently reports undelivered |
| `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` | `calls-token` | Video calls cannot start |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | `razorpay-order` | Checkout fails |
| `RAZORPAY_WEBHOOK_SECRET` | `razorpay-webhook` | Payments never captured |
| `ESCALATE_SECRET` | `sos-escalate` | Function returns 403 — SMS escalation disabled |
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | `sos-escalate` | SMS fallback skipped |
| `SENTRY_ORG`, `SENTRY_PROJECT` (build env) | both apps | No source-map upload; production stack traces stay minified |

Undelivered push is reported honestly rather than swallowed — `sos-trigger`
returns a real `delivered` count and the senior app falls through to a phone
call when it is zero.

---

## Building

```bash
# Android APK, installable by sideloading — the fastest real-device check
npm run build:senior:android
npm run build:family:android

# iOS simulator build — proves it compiles, no Apple account needed
npm run build:senior:ios
npm run build:family:ios

# Production: Android App Bundle for Play
npm run release:senior:android
npm run submit:senior:android
```

For an iOS build installable on a real device, use the `preview:device` profile
once an Apple account is attached:

```bash
cd apps/senior && eas build --profile preview:device --platform ios
```

---

## What the config actually does

`app.config.ts` (typed, replaces the old `app.json`) carries a few entries whose
absence causes silent failure rather than a build error. Worth knowing before
anyone "tidies" them away:

- **`expo-notifications` with `{ mode: 'production', enableBackgroundRemoteNotifications: true }`.**
  Expo auto-applies this plugin even when it isn't listed, but with defaults:
  `aps-environment: development` (sandbox APNs — production and TestFlight
  pushes silently fail) and no `remote-notification` in `UIBackgroundModes`,
  which means the data-only background push that wakes the app for an SOS
  **cannot fire at all**. These two props are the entire iOS notification fix.
- **`ios.infoPlist.LSApplicationQueriesSchemes`** — without `tez`, `phonepe`,
  `paytmmp`, Razorpay's UPI app-switch on iOS lists no apps.
- **`NSLocationWhenInUseUsageDescription`** — `expo-location` auto-generates a
  generic string. On a health app requesting location for an emergency feature,
  a reviewer will ask; the explicit copy answers it.
- **`plugins/withFullScreenIntent.js`** — sets `android:showWhenLocked` and
  `android:turnScreenOn` on `.MainActivity` so an SOS wakes the screen over the
  lock screen. There is no iOS equivalent; see below.
- **`scheme`** — needed by `expo-dev-client` and by QR/deep-link pairing.
- **`expo-build-properties` `deploymentTarget: '16.4'`** — SDK 57's floor.

### The iOS full-screen-alert limitation, stated plainly

Android gets a true full-screen intent over the lock screen. **iOS has no
equivalent.** The notification payloads set `interruptionLevel: 'timeSensitive'`,
which breaks through Focus modes but not the ringer switch, and is the strongest
presentation available without Apple's **Critical Alerts** entitlement — which
is requested case-by-case and can be refused.

A genuinely full-screen incoming call on iOS requires **CallKit + PushKit VoIP
pushes**, which is a separate transport that FCM cannot deliver and that Apple
restricts to real calling apps. That is deliberately not built. Do not describe
iOS SOS as equivalent to Android's until it is.

---

## Verifying a build

1. `npm run typecheck` and `npm test` must be green — CI gates both.
2. `cd apps/senior && npx expo config --type public` resolves the config without
   error. `npx expo prebuild --platform android --no-install` generates a native
   project you can inspect (then delete it; it's ephemeral and gitignored).
3. Sideload the Android APK and run **one real end-to-end SOS with the family
   app fully killed**. This is the flow worth hand-verifying every single time
   it is touched — it depends on the push credentials, the background task, the
   notification channel and the lock-screen manifest attributes all being right
   at once, and none of the automated tests cover it.
