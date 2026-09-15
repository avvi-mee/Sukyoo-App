import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { BookSlotButton } from './_components/BookSlotButton';

export default async function DoctorSlotsPage({ params }: { params: Promise<{ doctorId: string }> }) {
  const { doctorId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: doctor }, { data: slots }] = await Promise.all([
    supabase.from('doctor_profiles').select('*, profile:profiles(full_name)').eq('user_id', doctorId).maybeSingle(),
    supabase
      .from('doctor_availability_slots')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('is_booked', false)
      .gte('start_at', new Date().toISOString())
      .order('start_at')
      .limit(20),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold">{doctor?.profile?.full_name ?? 'Doctor'}</h1>
      <p className="mt-1 text-(--color-ink-muted)">{doctor?.specialty ?? 'General physician'}</p>

      <div className="mt-4 space-y-2">
        {(slots ?? []).map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-(--color-line) bg-(--color-surface) p-4">
            <div>
              <p className="font-semibold">
                {new Date(s.start_at).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
              </p>
              <p className="text-sm capitalize text-(--color-ink-muted)">{s.mode.replace('_', ' ')}</p>
            </div>
            <BookSlotButton slotId={s.id} userId={profile.id} mode={s.mode} />
          </div>
        ))}
        {!slots?.length ? <p className="text-sm text-(--color-ink-muted)">No upcoming slots — check back soon.</p> : null}
      </div>
    </div>
  );
}
