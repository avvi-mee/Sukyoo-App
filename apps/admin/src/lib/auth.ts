import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Permission, StaffContext, StaffRole } from './permissions';

/**
 * Loads the signed-in staff member's roles and permissions, or redirects.
 *
 * Reads from staff_members / staff_role_assignments / staff_role_permissions
 * under RLS as that user, so a non-staff account with a valid Supabase session
 * (a senior, say — same auth project) resolves to no staff row and is bounced.
 * Being logged in is not being staff.
 */
export async function requireStaff(): Promise<StaffContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('staff_members')
    .select('user_id, is_active, organization_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member?.is_active) redirect('/login?error=not_staff');

  const { data: assignments } = await supabase
    .from('staff_role_assignments')
    .select('role')
    .eq('user_id', user.id);

  const roles = (assignments ?? []).map((a) => a.role as StaffRole);
  if (!roles.length) redirect('/login?error=no_roles');

  const { data: grants } = await supabase
    .from('staff_role_permissions')
    .select('permission')
    .in('role', roles);

  return {
    userId: user.id,
    email: user.email ?? null,
    roles,
    permissions: new Set((grants ?? []).map((g) => g.permission as Permission)),
    organizationId: member.organization_id ?? null,
  };
}

/**
 * Gate a page or server action on a specific permission.
 *
 * This is belt-and-braces, not the control: the RLS policy behind the data is.
 * Its job is to fail LOUDLY at the route boundary rather than silently render an
 * empty page, which is the difference between "you don't have access" and "there
 * is no data".
 */
export async function requirePermission(permission: Permission): Promise<StaffContext> {
  const staff = await requireStaff();
  if (!staff.permissions.has(permission)) {
    redirect(`/?error=forbidden&needed=${encodeURIComponent(permission)}`);
  }
  return staff;
}
