'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createClient } from '../../lib/supabase/client';
import { acknowledgeEvent, recordDispatch, resolveEvent } from './actions';

export type SosRow = {
  id: string;
  senior_id: string;
  status: 'triggered' | 'acked' | 'resolved' | 'cancelled';
  latitude: number | null;
  longitude: number | null;
  triggered_at: string;
  resolved_at: string | null;
  senior: { full_name: string | null; phone: string | null } | null;
  sos_notifications: {
    id: string;
    recipient_id: string | null;
    channel: string;
    status: string;
    sent_at: string;
    acked_at: string | null;
  }[];
  care_dispatch: {
    id: string;
    dispatch_status: string;
    eta_minutes: number | null;
    notes: string | null;
    created_at: string;
  }[];
};

function minutesSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

/**
 * Audible alert for a new event.
 *
 * Generated with WebAudio rather than an audio file: this page must be able to
 * make a noise on a machine with no network to a CDN, and an <audio src> that
 * 404s fails silently — which on this screen means a missed emergency.
 */
function useAlarm() {
  const contextRef = useRef<AudioContext | null>(null);

  return () => {
    try {
      contextRef.current ??= new AudioContext();
      const ctx = contextRef.current;
      // Browsers suspend audio contexts created before a user gesture.
      if (ctx.state === 'suspended') void ctx.resume();

      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, now + i * 0.45);
        gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.45 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.45 + 0.32);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.45);
        osc.stop(now + i * 0.45 + 0.35);
      }
    } catch {
      // Audio is an enhancement; the visual queue is the actual control.
    }
  };
}

export function SosQueue({
  initialOpen,
  recent,
  canManage,
  canReadHealth,
}: {
  initialOpen: SosRow[];
  recent: SosRow[];
  canManage: boolean;
  canReadHealth: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [soundArmed, setSoundArmed] = useState(false);
  const playAlarm = useAlarm();
  const knownIds = useRef(new Set(initialOpen.map((e) => e.id)));

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('ops-sos-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_events' }, async () => {
        // Refetch rather than patching from the payload: the payload carries the
        // row only, and this view needs the joined senior, notifications and
        // dispatch records. Correctness over cleverness on a safety screen.
        const { data } = await supabase
          .from('sos_events')
          .select(
            `id, senior_id, status, latitude, longitude, triggered_at, resolved_at,
             senior:profiles!sos_events_senior_id_fkey(full_name, phone),
             sos_notifications(id, recipient_id, channel, status, sent_at, acked_at),
             care_dispatch(id, dispatch_status, eta_minutes, notes, created_at)`
          )
          .in('status', ['triggered', 'acked'])
          .order('triggered_at', { ascending: false });

        const rows = (data ?? []) as unknown as SosRow[];
        if (rows.some((r) => !knownIds.current.has(r.id))) playAlarm();
        knownIds.current = new Set(rows.map((r) => r.id));
        setOpen(rows);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [playAlarm]);

  return (
    <>
      {!soundArmed ? (
        // Browsers won't let a page make noise before a gesture, so an operator
        // has to arm it once per shift. Saying so is better than a silent alarm
        // everyone assumes is working.
        <button
          onClick={() => {
            setSoundArmed(true);
            playAlarm();
          }}
          className="mb-5 w-full rounded-lg border border-[--color-warn] bg-[--color-warn-tint] px-4 py-3 text-left text-sm font-semibold text-[--color-warn]"
        >
          Click once to enable the audible alarm for this shift — your browser blocks sound until you do.
        </button>
      ) : null}

      <section aria-live="polite">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
          Open ({open.length})
        </h2>

        {open.length === 0 ? (
          <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-6 text-sm text-[--color-ink-muted]">
            No open SOS events.
          </p>
        ) : (
          <ul className="space-y-4">
            {open.map((event) => (
              <SosCard
                key={event.id}
                event={event}
                canManage={canManage}
                canReadHealth={canReadHealth}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
          Closed recently — shift handover
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-[--color-ink-muted]">Nothing closed recently.</p>
        ) : (
          <ul className="divide-y divide-[--color-line] rounded-lg border border-[--color-line] bg-[--color-surface]">
            {recent.map((event) => (
              <li key={event.id} className="flex items-baseline justify-between px-4 py-3 text-sm">
                <span className="font-medium">{event.senior?.full_name ?? 'Unknown senior'}</span>
                <span className="text-[--color-ink-muted]">
                  {event.status} · {new Date(event.triggered_at).toLocaleString('en-IN')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function SosCard({
  event,
  canManage,
  canReadHealth,
}: {
  event: SosRow;
  canManage: boolean;
  canReadHealth: boolean;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unacked = event.status === 'triggered';
  const pushes = event.sos_notifications.filter((n) => n.channel === 'push');
  const delivered = pushes.filter((n) => n.status === 'sent').length;
  const acked = pushes.filter((n) => n.acked_at).length;

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
      else setNote('');
    });
  }

  return (
    <li
      className={`rounded-lg border bg-[--color-surface] p-5 ${
        unacked ? 'sos-pulse border-[--color-danger]' : 'border-[--color-line]'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-base font-bold">{event.senior?.full_name ?? 'Unknown senior'}</p>
          <p className="mt-0.5 text-sm text-[--color-ink-muted]">
            {minutesSince(event.triggered_at)} min ago · {new Date(event.triggered_at).toLocaleTimeString('en-IN')}
          </p>
        </div>
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase ${
            unacked
              ? 'bg-[--color-danger-tint] text-[--color-danger]'
              : 'bg-[--color-warn-tint] text-[--color-warn]'
          }`}
        >
          {event.status}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[--color-ink-muted]">Phone</dt>
          <dd className="font-medium">
            {event.senior?.phone ? (
              <a href={`tel:${event.senior.phone}`} className="text-[--color-brand] underline">
                {event.senior.phone}
              </a>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[--color-ink-muted]">Family reached</dt>
          {/* The honest number. sos-trigger records per-recipient delivery, so a
              zero here means nobody's phone actually got it. */}
          <dd className={`font-medium ${delivered === 0 ? 'text-[--color-danger]' : ''}`}>
            {delivered} of {pushes.length}
          </dd>
        </div>
        <div>
          <dt className="text-[--color-ink-muted]">Family acked</dt>
          <dd className="font-medium">{acked}</dd>
        </div>
        <div>
          <dt className="text-[--color-ink-muted]">Location</dt>
          <dd className="font-medium">
            {event.latitude != null && event.longitude != null ? (
              <a
                href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-[--color-brand] underline"
              >
                Open map
              </a>
            ) : (
              'Not shared'
            )}
          </dd>
        </div>
      </dl>

      {delivered === 0 && pushes.length > 0 ? (
        <p className="mt-3 rounded-md bg-[--color-danger-tint] px-3 py-2 text-sm font-semibold text-[--color-danger]">
          No family device received this alert. Call the senior directly.
        </p>
      ) : null}
      {pushes.length === 0 ? (
        <p className="mt-3 rounded-md bg-[--color-danger-tint] px-3 py-2 text-sm font-semibold text-[--color-danger]">
          This senior has nobody linked to alert. Call them directly.
        </p>
      ) : null}

      {event.care_dispatch.length ? (
        <div className="mt-4 rounded-md bg-[--color-canvas] p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[--color-ink-muted]">Timeline</p>
          <ul className="mt-2 space-y-1 text-sm">
            {[...event.care_dispatch]
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((d) => (
                <li key={d.id}>
                  <span className="font-medium">{d.dispatch_status}</span>
                  {d.eta_minutes ? ` · ETA ${d.eta_minutes} min` : ''}
                  {d.notes ? ` — ${d.notes}` : ''}
                  <span className="text-[--color-ink-muted]">
                    {' '}
                    ({new Date(d.created_at).toLocaleTimeString('en-IN')})
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {canManage ? (
        <div className="mt-4 border-t border-[--color-line] pt-4">
          <label className="block text-sm font-medium" htmlFor={`note-${event.id}`}>
            What are you doing? <span className="font-normal text-[--color-ink-muted]">(required, logged)</span>
          </label>
          <textarea
            id={`note-${event.id}`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Called Meera, she is conscious and waiting with a neighbour."
            className="mt-1 w-full rounded-md border border-[--color-line] px-3 py-2 text-sm"
          />

          {error ? (
            <p role="alert" className="mt-2 text-sm font-medium text-[--color-danger]">
              {error}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {unacked ? (
              <button
                disabled={pending}
                onClick={() => run(() => acknowledgeEvent(event.id, note))}
                className="rounded-md bg-[--color-danger] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                I&rsquo;ve got this
              </button>
            ) : null}
            <button
              disabled={pending}
              onClick={() =>
                run(() =>
                  recordDispatch({
                    sosEventId: event.id,
                    dispatchStatus: 'contacted_senior',
                    etaMinutes: null,
                    note,
                  })
                )
              }
              className="rounded-md border border-[--color-line] px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Log a note
            </button>
            <button
              disabled={pending}
              onClick={() => run(() => resolveEvent(event.id, note))}
              className="rounded-md border border-[--color-line] px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Close out
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 border-t border-[--color-line] pt-4 text-sm text-[--color-ink-muted]">
          You have read-only access to the SOS queue.
        </p>
      )}

      {canReadHealth ? (
        <a
          href={`/people/${event.senior_id}`}
          className="mt-3 inline-block text-sm text-[--color-brand] underline"
        >
          Open this person&rsquo;s record
        </a>
      ) : null}
    </li>
  );
}
