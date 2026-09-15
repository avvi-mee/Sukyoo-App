import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { Shell } from '@/components/Shell';

const NAV = [
  { href: '/senior', label: 'Home' },
  { href: '/senior/health', label: 'Health' },
  { href: '/senior/shop', label: 'Shop' },
  { href: '/senior/events', label: 'Events' },
  { href: '/senior/fun', label: 'Fun' },
  { href: '/senior/settings', label: 'Settings' },
];

export default async function SeniorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (profile.role === 'family') redirect('/family');

  return (
    <Shell brand="" nav={NAV} displayName={profile.fullName}>
      {children}
    </Shell>
  );
}
