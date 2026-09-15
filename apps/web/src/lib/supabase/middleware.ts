import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/signup', '/auth'];

/**
 * Refreshes the session cookie and gates every route on being signed in.
 *
 * Server Components cannot write cookies, so this is the only place a
 * rotated refresh token can be persisted — every response must go through
 * here. Role-based routing (which of /senior or /family a signed-in user
 * lands on) is handled per-portal-layout, not here: it's a UX preference,
 * not a security boundary — RLS and consent grants are what actually gate
 * data, exactly as in the mobile apps.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user) {
    if (isPublic) return response;
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isPublic && path !== '/auth/signout') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}
