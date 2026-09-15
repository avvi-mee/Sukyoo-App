import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/mfa', '/auth'];

/**
 * Refreshes the session cookie and gates every route.
 *
 * Two things happen here that must not be moved into a page:
 *
 * 1. Session refresh. Server Components cannot write cookies, so this is the
 *    only place the rotated refresh token can be persisted.
 * 2. The MFA gate. Supabase issues a session at `aal1` after a password login
 *    and only raises it to `aal2` once a TOTP challenge is verified. Checking
 *    for a user is NOT enough — a password alone would be a full staff session.
 *    We require aal2 before any console route.
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

  // Assurance level. `nextLevel` is aal2 once a factor is enrolled; if the
  // current level hasn't reached it, the password step happened but the second
  // factor didn't.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const needsMfa = aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2';

  if (needsMfa && !path.startsWith('/mfa')) {
    return NextResponse.redirect(new URL('/mfa', request.url));
  }

  // MFA is mandatory for staff: a user with no factor enrolled at all is sent
  // to enrol rather than being let through.
  if (!needsMfa && aal?.nextLevel !== 'aal2' && !path.startsWith('/mfa')) {
    return NextResponse.redirect(new URL('/mfa/enroll', request.url));
  }

  if (isPublic && !needsMfa && aal?.currentLevel === 'aal2' && path !== '/auth/signout') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}
