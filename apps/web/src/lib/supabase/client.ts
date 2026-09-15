import { createBrowserClient } from '@supabase/ssr';
// Type-only import — @sukyoo/core's generated Postgres types are pure
// TypeScript with no React Native dependency, so reusing them here keeps one
// source of truth for the schema without pulling in any of that package's
// runtime code (which IS RN-specific: SecureStore, AsyncStorage-shaped
// session storage). `import type` is erased before bundling, so this adds no
// runtime dependency on @sukyoo/core at all.
import type { Database } from '@sukyoo/core';

// Browser client — anon key only. Used for Realtime (the SOS banner) and any
// client-component mutation.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
