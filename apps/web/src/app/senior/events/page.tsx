import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { RsvpButton } from './_components/RsvpButton';

export default async function EventsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: events }, { data: myRsvps }] = await Promise.all([
    supabase.from('events').select('*').gte('starts_at', new Date().toISOString()).order('starts_at'),
    supabase.from('event_rsvps').select('event_id').eq('user_id', profile.id),
  ]);
  const rsvpedIds = new Set((myRsvps ?? []).map((r) => r.event_id));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold">Events</h1>
      <p className="mt-1 text-[--color-ink-muted]">Things happening near you.</p>

      <div className="mt-4 space-y-3">
        {(events ?? []).map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-xl border border-[--color-line] bg-[--color-surface] p-4">
            <div>
              <p className="font-bold">{e.title}</p>
              <p className="text-sm text-[--color-ink-muted]">
                {new Date(e.starts_at).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                {e.location_text ? ` · ${e.location_text}` : ''}
              </p>
            </div>
            <RsvpButton eventId={e.id} userId={profile.id} rsvped={rsvpedIds.has(e.id)} />
          </div>
        ))}
        {!events?.length ? <p className="text-sm text-[--color-ink-muted]">No upcoming events right now.</p> : null}
      </div>
    </div>
  );
}
