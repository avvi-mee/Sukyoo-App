import { createBrowserClient } from '@supabase/ssr';

// Browser client — anon key only. Used for the Realtime SOS subscription and
// for the MFA enrolment/challenge flow, both of which need to run client-side.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
