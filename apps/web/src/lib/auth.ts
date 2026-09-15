import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { UserRole } from '@sukyoo/core';

export type CurrentProfile = {
  id: string;
  role: UserRole;
  fullName: string | null;
  phone: string | null;
};

// Middleware already guarantees a signed-in user for every non-public route;
// this loads their profiles row (created by handle_new_user() at signup) and
// bounces to /login in the one edge case middleware can't see — a session
// whose profile row somehow doesn't exist.
export async function requireProfile(): Promise<CurrentProfile> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) redirect('/login');

  return { id: profile.id, role: profile.role, fullName: profile.full_name, phone: profile.phone };
}

// Sends a signed-in user to their portal — the one place this redirect
// target is decided, so / and a mismatched-portal visit both funnel through
// the same rule.
export function portalPathFor(role: UserRole): string {
  return role === 'family' ? '/family' : '/senior';
}
