import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side Supabase client, bound to the request's cookies.
//
// This uses the ANON key and the staff member's own session, on purpose. Every
// query therefore runs as that person under RLS — so a bug in this app leaks
// nothing an RLS policy wouldn't already allow. The service-role key is never
// imported here and must never reach the browser bundle.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The middleware refreshes the session instead, so this is safe to
            // swallow — see src/lib/supabase/middleware.ts.
          }
        },
      },
    }
  );
}
