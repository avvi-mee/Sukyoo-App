import { redirect } from 'next/navigation';
import { requireProfile, portalPathFor } from '@/lib/auth';

// Middleware already guarantees a signed-in user reaches here; this is just
// the role-based fork to /senior or /family.
export default async function RootPage() {
  const profile = await requireProfile();
  redirect(portalPathFor(profile.role));
}
