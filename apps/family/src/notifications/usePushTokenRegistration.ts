import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '@sukyoo/core';

// Registers the device's raw FCM token (not an Expo push token — the
// sos-trigger Edge Function calls FCM's HTTP v1 API directly, so it needs
// a real FCM registration token, see getDevicePushTokenAsync vs
// getExpoPushTokenAsync in expo-notifications' docs).
export function usePushTokenRegistration(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    const uid = userId; // stable capture — TS won't carry the narrowing above into the closure below
    let cancelled = false;

    async function register() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      const { data: token } = await Notifications.getDevicePushTokenAsync();
      if (cancelled || typeof token !== 'string') return;
      await supabase.from('push_tokens').upsert({ user_id: uid, token, platform: Platform.OS });
    }

    register().catch((e) => console.warn('Push token registration failed', e));
    return () => {
      cancelled = true;
    };
  }, [userId]);
}
