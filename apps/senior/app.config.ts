import { existsSync } from 'node:fs';
import type { ExpoConfig } from 'expo/config';

// google-services.json is a per-environment Firebase credential and is not in
// version control. Pointing `googleServicesFile` at a missing path fails the
// prebuild, so the key is omitted when the file isn't there — the repo stays
// clonable and `npx expo start` still works. Push is simply dead until it's
// added, which the warning below makes loud rather than silent.
const GOOGLE_SERVICES = './google-services.json';
const hasGoogleServices = existsSync(new URL(GOOGLE_SERVICES, import.meta.url));
if (!hasGoogleServices && process.env.EAS_BUILD === 'true') {
  console.warn(
    '\n[sukyoo] google-services.json is missing — FCM push will not work in this build.\n' +
      '         SOS alerts and incoming calls both depend on it. See docs/BUILDING.md.\n'
  );
}

// The @sentry/react-native config plugin is NOT a no-op without these two —
// unlike the SDK's own Sentry.init(), which is a genuine no-op with no DSN. The
// plugin unconditionally wires sentry.gradle into the Android build, and with
// no organization/project it falls back to the SENTRY_ORG/SENTRY_PROJECT env
// vars; with those also unset, sentry-cli exits 1 with "An organization ID or
// slug is required" and takes the whole Gradle build down — confirmed by a
// real failed EAS build. So the plugin entry itself is now conditional, the
// same way googleServicesFile above is: omitted until Sentry is actually set
// up. This does not touch crash reporting via Sentry.init(DSN) in
// src/observability/sentry.ts, which needs no config plugin — only the
// automatic native/gradle source-map upload is what's skipped.
const hasSentryConfig = Boolean(process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);

// A build with no Supabase credentials produces an APK that crashes the instant
// it launches: babel inlines `undefined` for a missing EXPO_PUBLIC_* var, and
// packages/core/src/supabaseClient.ts throws at import. The build itself
// succeeds, so the failure only shows up on a real device with no explanation.
//
// Fail the BUILD instead. `.env` reaches EAS via .easignore (which deliberately
// does not list it); if that ever regresses, this is what says so.
if (process.env.EAS_BUILD === 'true') {
  const missing = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'].filter(
    (key) => !process.env[key]
  );
  if (missing.length > 0) {
    throw new Error(
      [
        `[sukyoo] ${missing.join(' and ')} not set in this build.`,
        '         The resulting app would crash on launch. Either .env did not reach',
        '         EAS (check .easignore) or the values are missing from the profile.',
      ].join('\n')
    );
  }
}

const config: ExpoConfig = {
  name: 'Sukyoo',
  slug: 'sukyoo-senior',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  // Needed by expo-dev-client, and by the QR/deep-link pairing flow.
  scheme: 'sukyoo',

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.sukyoo.senior',
    // EAS manages the real value remotely (eas.json sets appVersionSource:
    // "remote"); this is only the seed for the first build.
    buildNumber: '1',
    infoPlist: {
      // expo-location's auto-applied plugin writes a generic
      // "Allow $(PRODUCT_NAME) to access your location" string. On a health app
      // that requests background-capable location for an emergency feature, an
      // App Store reviewer will ask what it's for — so say it explicitly.
      NSLocationWhenInUseUsageDescription:
        'Sukyoo attaches your location to an emergency SOS so your family and the care team can find you.',
      NSCameraUsageDescription: 'Sukyoo uses the camera for video calls with your family and doctors.',
      NSMicrophoneUsageDescription:
        'Sukyoo uses the microphone for video calls and for recording your life stories.',
      NSFaceIDUsageDescription: 'Sukyoo can use Face ID to keep you signed in securely.',
      // Razorpay's UPI app-switch on iOS silently lists nothing unless the
      // target apps are declared here. See the react-native-razorpay README,
      // "For UPI Intent in iOS".
      LSApplicationQueriesSchemes: ['tez', 'phonepe', 'paytmmp'],
    },

    // Apple Privacy Manifest. Expo merges this with every dependency's own
    // manifest at prebuild (@expo/config-plugins ios/PrivacyInfo.ts), so this
    // declares what OUR code does — not what the SDKs do.
    //
    // Must stay consistent with legal/PLAY_STORE_DATA_SAFETY.md: the same facts
    // drive both, and a regulator comparing them will notice a mismatch.
    //
    // NSPrivacyAccessedAPITypes are the "required reason" APIs. Shipping one
    // undeclared is an automatic rejection at upload, and the error names the
    // API but not which dependency called it.
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyAccessedAPITypes: [
        // expo-file-system / expo-secure-store stat files. C617.1 — inside the
        // app's own container.
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1'],
        },
        // AsyncStorage and react-query persistence. CA92.1 — the app's own
        // container, not another app's.
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        // Free space checked before an upload. E174.1 — to avoid a write that
        // would fail.
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1'],
        },
        // systemUptime, via React Native's performance timers. 35F9.1 —
        // measuring elapsed time inside the app.
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
      ],
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeHealthAndFitness',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        // Precise location, and only on an SOS — attached to the emergency event
        // so responders can find them. Never collected in the background.
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePreciseLocation',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        // Life-story recordings and health-record scans.
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeAudioData',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhotosorVideos',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeName',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhoneNumber',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePurchaseHistory',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherDiagnosticData',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
      ],
    },
  },

  android: {
    package: 'com.sukyoo.senior',
    permissions: ['USE_FULL_SCREEN_INTENT', 'CAMERA', 'RECORD_AUDIO'],
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    ...(hasGoogleServices ? { googleServicesFile: GOOGLE_SERVICES } : {}),
  },

  web: { favicon: './assets/favicon.png' },

  plugins: [
    // Notifee fork. The NSE lets iOS mutate/enrich a delivered notification;
    // without it the iOS side of an SOS is a plain banner.
    ['react-native-notify-kit', { ios: { notificationServiceExtension: true } }],
    './plugins/withFullScreenIntent.js',

    // THE iOS FIX. Auto-application (which happens whether or not this entry
    // exists) defaults to mode 'development' — sandbox APNs, so production and
    // TestFlight pushes silently fail — and leaves UIBackgroundModes without
    // 'remote-notification', so the data-only background push that sos-trigger
    // sends can never wake the app. Both SOS and incoming calls are dead on
    // iOS without these two props.
    [
      'expo-notifications',
      {
        mode: 'production',
        enableBackgroundRemoteNotifications: true,
      },
    ],

    [
      'expo-camera',
      {
        cameraPermission: 'Allow Sukyoo to access your camera for video calls',
        microphonePermission: 'Allow Sukyoo to access your microphone for video calls',
      },
    ],
    'expo-audio',

    [
      'expo-secure-store',
      {
        configureAndroidBackup: true,
        faceIDPermission: 'Allow Sukyoo to use Face ID to keep you signed in securely.',
      },
    ],

    [
      'expo-build-properties',
      {
        // 16.4 is SDK 57's floor — expo-build-properties rejects anything
        // lower. Pinned explicitly so an SDK bump can't move it silently.
        ios: { deploymentTarget: '16.4' },
        android: { minSdkVersion: 24 },
      },
    ],

    // Omitted entirely until SENTRY_ORG/SENTRY_PROJECT exist — see
    // hasSentryConfig above for why this can't just pass through undefined.
    ...(hasSentryConfig
      ? [
          [
            '@sentry/react-native',
            {
              organization: process.env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT,
            },
          ],
        ]
      : []),
  ],

  // Written by `eas init`, which cannot auto-write this into a dynamic
  // (TypeScript) config — only into a static app.json. Without it,
  // appVersionSource: "remote" in eas.json has nothing to point at and no
  // build can start.
  extra: {
    eas: {
      projectId: '14142c4c-7c4d-4663-99c6-85f0f8703b9d',
    },
  },
};

export default config;
