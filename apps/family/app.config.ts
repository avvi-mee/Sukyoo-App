import { existsSync } from 'node:fs';
import type { ExpoConfig } from 'expo/config';

// See the senior app's config for the reasoning — same shape, different ids.
const GOOGLE_SERVICES = './google-services.json';
const hasGoogleServices = existsSync(new URL(GOOGLE_SERVICES, import.meta.url));
if (!hasGoogleServices && process.env.EAS_BUILD === 'true') {
  console.warn(
    '\n[sukyoo] google-services.json is missing — FCM push will not work in this build.\n' +
      '         This app exists to receive SOS alerts; without it, it receives nothing.\n' +
      '         See docs/BUILDING.md.\n'
  );
}

// See the senior app's config for the full reasoning: the @sentry/react-native
// config plugin unconditionally wires a Gradle source-map upload step, and
// with no org/project (and no matching env vars) sentry-cli hard-fails the
// build rather than skipping — confirmed by a real failed EAS build. Omitted
// entirely until Sentry is actually set up; Sentry.init(DSN) in
// src/observability/sentry.ts is unaffected either way.
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
  name: 'Sukyoo Family',
  slug: 'sukyoo-family',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'sukyoofamily',

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.sukyoo.family',
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription: 'Sukyoo Family uses the camera for video calls with your family member.',
      NSMicrophoneUsageDescription: 'Sukyoo Family uses the microphone for video calls.',
      NSFaceIDUsageDescription: 'Sukyoo Family can use Face ID to keep you signed in securely.',
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
    //
    // Deliberately NARROWER than the senior app: this one never records life
    // stories and never collects the carer's own location. Declaring collection
    // it does not perform would be a false statement on the App Privacy form.
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
    package: 'com.sukyoo.family',
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
    './plugins/withFullScreenIntent.js',
    ['react-native-notify-kit', { ios: { notificationServiceExtension: true } }],

    // See the senior config: these two props are what make an SOS reach an
    // iPhone at all. This app is the one that RECEIVES the alert, so the
    // consequence of getting it wrong lands here.
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
        cameraPermission: 'Allow Sukyoo Family to access your camera for video calls',
        microphonePermission: 'Allow Sukyoo Family to access your microphone for video calls',
      },
    ],
    'expo-audio',

    [
      'expo-secure-store',
      {
        configureAndroidBackup: true,
        faceIDPermission: 'Allow Sukyoo Family to use Face ID to keep you signed in securely.',
      },
    ],

    [
      'expo-build-properties',
      {
        // 16.4 is SDK 57's floor — expo-build-properties rejects anything lower.
        ios: { deploymentTarget: '16.4' },
        android: { minSdkVersion: 24 },
      },
    ],

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
      projectId: 'e3c8a5f0-82b5-4f8d-ac60-962320a9ce1e',
    },
  },
};

export default config;
