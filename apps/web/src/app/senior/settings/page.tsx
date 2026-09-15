import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function SeniorSettingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold">Settings</h1>

      <div className="mt-4 rounded-2xl border border-[--color-line] bg-[--color-surface] p-5">
        <h2 className="text-lg font-bold">Your account</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-[--color-ink-muted]">Name</dt>
            <dd className="font-medium">{profile.fullName ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[--color-ink-muted]">Email</dt>
            <dd className="font-medium">{user?.email ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[--color-ink-muted]">Phone</dt>
            <dd className="font-medium">{profile.phone ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 rounded-2xl border border-[--color-line] bg-[--color-surface] p-5">
        <h2 className="text-lg font-bold">Who can see your information</h2>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          Manage exactly what each linked family member can see from the Health page.
        </p>
        <Link href="/senior/health#family-sharing" className="mt-3 inline-block text-sm font-semibold text-[--color-coral] underline">
          Go to Family sharing
        </Link>
      </div>
    </div>
  );
}
