const { withAndroidManifest } = require('expo/config-plugins');

// Notifee's fullScreenAction needs the launch activity to be allowed to show
// over the lock screen and wake the device — there's no app.json field for
// these two attributes, so they're added directly to AndroidManifest.xml.
// See: https://notifee.app/react-native/docs/android/behaviour#full-screen
module.exports = function withFullScreenIntent(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    const mainActivity = app?.activity?.find((a) => a.$?.['android:name'] === '.MainActivity');
    if (mainActivity) {
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
    }
    return config;
  });
};
