import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DoctorsPage() {
  const supabase = await createClient();
  const { data: doctors } = await supabase
    .from('doctor_profiles')
    .select('*, profile:profiles(full_name)')
    .eq('is_verified', true);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold">Find a doctor</h1>
      <div className="mt-4 space-y-3">
        {(doctors ?? []).map((d) => (
          <Link
            key={d.user_id}
            href={`/senior/health/doctors/${d.user_id}`}
            className="block rounded-xl border border-(--color-line) bg-(--color-surface) p-4 hover:bg-(--color-coral-tint)"
          >
            <p className="font-bold">{d.profile?.full_name ?? 'Doctor'}</p>
            <p className="text-sm text-(--color-ink-muted)">
              {d.specialty ?? 'General physician'}
              {d.years_experience ? ` · ${d.years_experience} yrs experience` : ''}
            </p>
          </Link>
        ))}
        {!doctors?.length ? <p className="text-sm text-(--color-ink-muted)">No doctors available right now.</p> : null}
      </div>
    </div>
  );
}
