import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { Shell } from '@/components/Shell';

const NAV = [
  { href: '/family', label: 'Home' },
  { href: '/family/link-senior', label: 'Link a senior' },
  { href: '/family/records', label: 'Shared records' },
  { href: '/family/orders', label: 'Send something' },
  { href: '/family/stories', label: 'Stories' },
  { href: '/family/settings', label: 'Settings' },
];

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  // A senior account has no reason to be in the family portal — send them
  // to their own. This is a UX routing preference, not the security
  // boundary: RLS and consent grants gate the data regardless.
  if (profile.role !== 'family') redirect('/senior');

  return (
    <Shell brand="Family" nav={NAV} displayName={profile.fullName}>
      {children}
    </Shell>
  );
}
