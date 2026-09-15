import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { secureStoreAdapter } from './secureStoreAdapter';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env in this app and fill them in.'
  );
}

// Session storage via expo-secure-store (Keychain / Android Keystore,
// WHEN_UNLOCKED_THIS_DEVICE_ONLY) rather than plain AsyncStorage — this app
// holds health records, and a lost/stolen device shouldn't leave a live
// session sitting in unencrypted storage. See secureStoreAdapter.ts for the
// chunking this requires.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase's token auto-refresh timer keeps running in the background even
// when the app is backgrounded; pause/resume it with app state so it doesn't
// burn battery or refresh on a dead connection.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
