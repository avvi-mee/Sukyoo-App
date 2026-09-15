import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const TILES = [
  { href: '/senior/health', label: 'Health', hint: 'Vitals, medicines, doctors', color: '--color-coral', tint: '--color-coral-tint' },
  { href: '/senior/shop', label: 'Shop', hint: 'Order what you need', color: '--color-green', tint: '--color-green-tint' },
  { href: '/senior/events', label: 'Events', hint: 'Things happening nearby', color: '--color-amber', tint: '--color-amber-tint' },
  { href: '/senior/fun', label: 'Fun', hint: 'Record your stories', color: '--color-ink', tint: '--color-surface' },
] as const;

export default async function SeniorHomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // doctor_bookings has no direct FK to doctor_profiles — the real path is
  // slot_id -> doctor_availability_slots -> doctor_id -> doctor_profiles, so
  // the embed has to nest through slot, not sit beside it (mirrors
  // packages/core's useUpcomingBooking, which uses this same nested shape).
  const { data: upcoming } = await supabase
    .from('doctor_bookings')
    .select(
      '*, slot:doctor_availability_slots(start_at, mode, doctor:doctor_profiles(profile:profiles(full_name)))'
    )
    .eq('patient_id', profile.id)
    .eq('status', 'booked')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold">Hello{profile.fullName ? `, ${profile.fullName}` : ''}</h1>
      <p className="mt-1 text-(--color-ink-muted)">Good to see you.</p>

      {upcoming ? (
        <div className="mt-6 rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
          <p className="text-sm font-semibold text-(--color-coral)">Upcoming appointment</p>
          <p className="mt-1 text-lg font-bold">
            {upcoming.slot?.doctor?.profile?.full_name ?? 'Your doctor'} —{' '}
            {upcoming.slot ? new Date(upcoming.slot.start_at).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''}
          </p>
          <p className="mt-0.5 text-sm text-(--color-ink-muted) capitalize">{upcoming.slot?.mode.replace('_', ' ')}</p>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="rounded-2xl border p-6 transition hover:opacity-90"
            style={{ borderColor: `var(${tile.color})`, backgroundColor: `var(${tile.tint})` }}
          >
            <p className="text-xl font-extrabold" style={{ color: `var(${tile.color})` }}>
              {tile.label}
            </p>
            <p className="mt-1 text-sm text-(--color-ink-muted)">{tile.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
