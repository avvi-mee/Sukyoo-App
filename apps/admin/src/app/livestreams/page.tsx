import Link from 'next/link';
import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';
import { Shell } from '../../components/Shell';
import { can } from '../../lib/permissions';
import { OneOffForm, SeriesCard, SeriesForm, StreamCard } from './LivestreamControls';

export const dynamic = 'force-dynamic';

export type Stream = {
  id: string;
  series_id: string | null;
  title: string;
  category: string | null;
  host_name: string | null;
  starts_at: string;
  ends_at: string;
  state: string;
  playback_url: string | null;
  recording_url: string | null;
  viewer_count: number;
  peak_viewer_count: number;
  killed_reason: string | null;
  livestream_registrations: { count: number }[];
  livestream_reminders: { offset_label: string; sent_at: string | null; recipient_count: number | null }[];
};

export type Series = {
  id: string;
  title: string;
  category: string | null;
  host_name: string | null;
  recurrence_rule: string;
  start_time: string;
  duration_minutes: number;
  is_active: boolean;
};

export default async function LivestreamsPage() {
  const staff = await requirePermission('content.read');
  const supabase = await createClient();

  const [{ data: streams }, { data: series }] = await Promise.all([
    supabase
      .from('livestreams')
      .select(
        `id, series_id, title, category, host_name, starts_at, ends_at, state,
         playback_url, recording_url, viewer_count, peak_viewer_count, killed_reason,
         livestream_registrations(count),
         livestream_reminders(offset_label, sent_at, recipient_count)`
      )
      .order('starts_at', { ascending: true })
      .limit(200),
    supabase
      .from('livestream_series')
      .select('id, title, category, host_name, recurrence_rule, start_time, duration_minutes, is_active')
      .order('title'),
  ]);

  const all = (streams ?? []) as unknown as Stream[];
  const canManage = can(staff, 'content.manage');
  const now = Date.now();

  const onAir = all.filter((s) => s.state === 'live');
  const upcoming = all
    .filter((s) => s.state === 'scheduled' && Date.parse(s.starts_at) >= now)
    .slice(0, 40);
  // A scheduled broadcast whose start time has passed never went live. That is
  // the failure worth putting at the top: somebody was told to expect it.
  const missed = all.filter((s) => s.state === 'scheduled' && Date.parse(s.ends_at) < now);
  const past = all
    .filter((s) => ['ended', 'archived', 'cancelled'].includes(s.state))
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
    .slice(0, 30);

  const unready = upcoming.filter(
    (s) => !s.playback_url && Date.parse(s.starts_at) < now + 24 * 3_600_000
  );

  return (
    <Shell staff={staff}>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Livestreams</h1>
          <p className="mt-1 text-sm text-[--color-ink-muted]">
            Only people who registered interest are notified, at 24 hours, one hour and at the start. Pulling a
            broadcast removes its unsent reminders in the same transaction.
          </p>
        </div>
        <Link href="/content" className="text-sm text-[--color-brand] underline">
          Content library
        </Link>
      </header>

      {missed.length > 0 ? (
        <div className="mb-6 rounded-lg border border-[--color-danger] bg-[--color-danger-tint] p-4 text-sm text-[--color-danger]">
          <p className="font-bold">
            {missed.length} broadcast{missed.length === 1 ? '' : 's'} never went live
          </p>
          <p className="mt-1">
            Their scheduled slot has passed while still marked scheduled. Anyone who registered was told to expect
            them — cancel them with a reason so the record is honest.
          </p>
        </div>
      ) : null}

      {unready.length > 0 ? (
        <div className="mb-6 rounded-lg border border-[--color-warn] bg-[--color-warn-tint] p-4 text-sm text-[--color-warn]">
          <p className="font-bold">
            {unready.length} broadcast{unready.length === 1 ? '' : 's'} airing within 24 hours with no stream URL
          </p>
          <p className="mt-1">
            The database refuses to take a stream live without one, so this would fail at air time rather than play
            silence: {unready.map((s) => s.title).join(', ')}.
          </p>
        </div>
      ) : null}

      {onAir.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-danger]">On air now</h2>
          <div className="space-y-3">
            {onAir.map((s) => (
              <StreamCard key={s.id} stream={s} canManage={canManage} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
          Upcoming{missed.length > 0 ? ' & missed' : ''}
        </h2>
        {missed.length === 0 && upcoming.length === 0 ? (
          <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-6 text-sm text-[--color-ink-muted]">
            Nothing scheduled.
          </p>
        ) : (
          <div className="space-y-3">
            {[...missed, ...upcoming].map((s) => (
              <StreamCard key={s.id} stream={s} canManage={canManage} />
            ))}
          </div>
        )}
      </section>

      {canManage ? (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
              Schedule a one-off
            </h2>
            <div className="rounded-lg border border-[--color-line] bg-[--color-surface] p-5">
              <OneOffForm />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
              Recurring series
            </h2>
            <div className="rounded-lg border border-[--color-line] bg-[--color-surface] p-5">
              <SeriesForm />
            </div>
          </section>
        </>
      ) : null}

      {(series ?? []).length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">Series</h2>
          <div className="space-y-3">
            {((series ?? []) as Series[]).map((s) => (
              <SeriesCard
                key={s.id}
                series={s}
                canManage={canManage}
                scheduled={all.filter((st) => st.series_id === s.id && st.state === 'scheduled').length}
              />
            ))}
          </div>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">Past</h2>
          <div className="divide-y divide-[--color-line] rounded-lg border border-[--color-line] bg-[--color-surface]">
            {past.map((s) => (
              <div key={s.id} className="px-4 py-3 text-sm">
                <span className="font-medium">{s.title}</span>
                <span className="text-[--color-ink-muted]">
                  {' '}
                  — {new Date(s.starts_at).toLocaleString('en-IN')} · {s.state}
                  {s.peak_viewer_count > 0 ? ` · peak ${s.peak_viewer_count} viewers` : ''}
                </span>
                {s.killed_reason ? (
                  <p className="mt-0.5 text-xs text-[--color-danger]">{s.killed_reason}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Shell>
  );
}
