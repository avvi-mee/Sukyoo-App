import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '@sukyoo/core';

// Raw FCM device token, not an Expo push token — see the family app's copy
// of this hook for why (the Edge Functions call FCM's HTTP v1 API directly).
export function usePushTokenRegistration(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    const uid = userId;
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
