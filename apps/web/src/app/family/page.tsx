import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AckSosButton } from './_components/AckSosButton';
import { SosAlarm } from './_components/SosAlarm';

export default async function FamilyHomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: links } = await supabase
    .from('family_links')
    .select('id, senior_id, senior:profiles!family_links_senior_id_fkey(full_name, phone)')
    .eq('family_member_id', profile.id)
    .eq('status', 'active');

  const seniorIds = (links ?? []).map((l) => l.senior_id);

  const { data: sosEvents } = seniorIds.length
    ? await supabase
        .from('sos_events')
        .select('id, senior_id, status, triggered_at')
        .in('senior_id', seniorIds)
        .in('status', ['triggered', 'acked'])
        .order('triggered_at', { ascending: false })
    : { data: [] };

  const nameFor = (seniorId: string) =>
    links?.find((l) => l.senior_id === seniorId)?.senior?.full_name ?? 'Your family member';

  const hasActive = (sosEvents ?? []).length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-extrabold">Hello, {profile.fullName ?? 'there'}</h1>

      {hasActive ? (
        <div className="sos-pulse space-y-3 rounded-2xl bg-(--color-red) p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-extrabold">Emergency SOS active</p>
            <SosAlarm active={hasActive} />
          </div>
          {(sosEvents ?? []).map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2">
              <p className="text-sm">
                {nameFor(event.senior_id)} — status: {event.status}
              </p>
              <AckSosButton sosEventId={event.id} />
            </div>
          ))}
        </div>
      ) : null}

      {(links ?? []).length === 0 ? (
        <p className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-6 text-sm text-(--color-ink-muted)">
          Not linked to anyone yet —{' '}
          <Link href="/family/link-senior" className="font-semibold text-(--color-coral)">
            link a senior
          </Link>{' '}
          to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(links ?? []).map((link) => (
            <div key={link.id} className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
              <p className="text-base font-bold">{link.senior?.full_name ?? 'Family member'}</p>
              {link.senior?.phone ? <p className="text-sm text-(--color-ink-muted)">{link.senior.phone}</p> : null}
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-(--color-coral)">
                <Link href={`/family/records?senior=${link.senior_id}`}>Shared records</Link>
                <Link href={`/family/orders?senior=${link.senior_id}`}>Send something</Link>
                <Link href={`/family/stories?senior=${link.senior_id}`}>Stories</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
