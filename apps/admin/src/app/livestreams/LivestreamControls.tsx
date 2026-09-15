'use client';

import { useState, useTransition } from 'react';
import {
  generateSchedule,
  saveSeries,
  scheduleOneOff,
  setPlaybackUrl,
  setSeriesActive,
  setState,
} from './actions';
import type { Series, Stream } from './page';

type Message = { kind: 'error' | 'notice'; text: string } | null;

const INPUT = 'rounded-md border border-[--color-line] bg-[--color-surface] px-2.5 py-1.5 text-sm';
const BUTTON =
  'rounded-md bg-[--color-brand] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50';
const DANGER =
  'rounded-md bg-[--color-danger] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50';

const CATEGORIES = ['devotional', 'music', 'talk', 'exercise', 'health_talk'];

function Note({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={`mt-2 text-sm ${message.kind === 'error' ? 'text-[--color-danger]' : 'text-[--color-ok]'}`}
    >
      {message.text}
    </p>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <span className="block font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-0.5 block text-xs text-[--color-ink-muted]">{hint}</span> : null}
    </label>
  );
}

// ---------------------------------------------------------------------------

export function StreamCard({ stream, canManage }: { stream: Stream; canManage: boolean }) {
  const [reason, setReason] = useState('');
  const [url, setUrl] = useState(stream.playback_url ?? '');
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  const registered = stream.livestream_registrations?.[0]?.count ?? 0;
  const startsAt = Date.parse(stream.starts_at);
  const endsAt = Date.parse(stream.ends_at);
  const now = Date.now();
  const isMissed = stream.state === 'scheduled' && endsAt < now;
  const live = stream.state === 'live';
  // Pulling before the scheduled end needs a reason; ending after it does not.
  // Mirrors set_livestream_state() so the form asks for exactly what the RPC
  // will demand.
  const endingEarly = live && now < endsAt;

  const act = (state: string) =>
    startTransition(async () => {
      const result = await setState(stream.id, state, reason);
      setMessage(result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! });
      if (!result.error) setReason('');
    });

  return (
    <div
      className={`rounded-lg border bg-[--color-surface] p-4 ${
        live
          ? 'border-[--color-danger]'
          : isMissed
            ? 'border-[--color-danger]'
            : 'border-[--color-line]'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-medium">{stream.title}</span>
          {live ? (
            <span className="ml-2 rounded bg-[--color-danger] px-2 py-0.5 text-xs font-bold uppercase text-white">
              live
            </span>
          ) : isMissed ? (
            <span className="ml-2 rounded bg-[--color-danger-tint] px-2 py-0.5 text-xs font-bold uppercase text-[--color-danger]">
              never aired
            </span>
          ) : null}
          <span className="mt-0.5 block text-xs text-[--color-ink-muted]">
            {new Date(startsAt).toLocaleString('en-IN')} → {new Date(endsAt).toLocaleTimeString('en-IN')}
            {stream.host_name ? ` · ${stream.host_name}` : ''}
            {stream.category ? ` · ${stream.category}` : ''}
            {' · '}
            {registered} registered
            {live ? ` · ${stream.viewer_count} watching` : ''}
            {stream.series_id ? ' · part of a series' : ''}
          </span>
        </div>
      </div>

      {/* Delivery, not intent. A reminder marked sent to zero devices means the
          registered viewers have no push tokens — worth seeing before air. */}
      {stream.livestream_reminders?.length > 0 ? (
        <p className="mt-2 text-xs text-[--color-ink-muted]">
          {stream.livestream_reminders
            .map(
              (r) =>
                `${r.offset_label.replace('t_minus_', '−').replace('h', 'h')}: ${
                  r.sent_at
                    ? r.recipient_count === null
                      ? 'sent'
                      : `${r.recipient_count} device${r.recipient_count === 1 ? '' : 's'}`
                    : 'queued'
                }`
            )
            .join(' · ')}
        </p>
      ) : (
        <p className="mt-2 text-xs text-[--color-ink-muted]">No reminders queued.</p>
      )}

      {canManage ? (
        <div className="mt-3 space-y-2">
          {!live ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://… stream URL"
                aria-label="Playback URL"
                className={`min-w-64 flex-1 ${INPUT}`}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await setPlaybackUrl(stream.id, url);
                    setMessage(
                      result.error
                        ? { kind: 'error', text: result.error }
                        : { kind: 'notice', text: result.notice! }
                    );
                  })
                }
                className="rounded-md border border-[--color-line] px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
              >
                Save URL
              </button>
            </div>
          ) : null}

          {(live && endingEarly) || stream.state === 'scheduled' ? (
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                live ? 'Why is this being pulled?' : 'Why is this being cancelled?'
              }
              aria-label="Reason"
              className={`w-full ${INPUT}`}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {stream.state === 'scheduled' ? (
              <>
                <button
                  type="button"
                  disabled={pending || !url.trim()}
                  onClick={() => act('live')}
                  className={BUTTON}
                  title={url.trim() ? undefined : 'Save a stream URL first'}
                >
                  Go live
                </button>
                <button
                  type="button"
                  disabled={pending || reason.trim().length < 10}
                  onClick={() => act('cancelled')}
                  className={DANGER}
                >
                  Cancel broadcast
                </button>
              </>
            ) : null}

            {live ? (
              <button
                type="button"
                disabled={pending || (endingEarly && reason.trim().length < 10)}
                onClick={() => act('ended')}
                className={DANGER}
              >
                {endingEarly ? 'Pull off air' : 'End broadcast'}
              </button>
            ) : null}

            {stream.state === 'ended' ? (
              <button type="button" disabled={pending} onClick={() => act('archived')} className={BUTTON}>
                Archive
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Note message={message} />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function OneOffForm() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'devotional',
    hostName: '',
    startsAt: '',
    durationMinutes: '45',
  });
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title">
          <input value={form.title} onChange={(e) => set('title')(e.target.value)} className={`mt-1 w-full ${INPUT}`} />
        </Field>
        <Field label="Host">
          <input
            value={form.hostName}
            onChange={(e) => set('hostName')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>
        <Field label="Starts at" hint="Your browser's local time.">
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => set('startsAt')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>
        <Field label="Duration (minutes)">
          <input
            type="number"
            min={1}
            value={form.durationMinutes}
            onChange={(e) => set('durationMinutes')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>
        <Field label="Category">
          <select
            value={form.category}
            onChange={(e) => set('category')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description">
          <input
            value={form.description}
            onChange={(e) => set('description')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>
      </div>

      <button
        type="button"
        disabled={pending || !form.title.trim() || !form.startsAt}
        onClick={() =>
          startTransition(async () => {
            const result = await scheduleOneOff(form);
            setMessage(
              result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! }
            );
            if (!result.error) setForm((f) => ({ ...f, title: '', description: '', startsAt: '' }));
          })
        }
        className={`mt-4 ${BUTTON}`}
      >
        {pending ? 'Scheduling…' : 'Schedule'}
      </button>

      <Note message={message} />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function SeriesForm() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'devotional',
    hostName: '',
    recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU,FR',
    startTime: '18:00',
    durationMinutes: '45',
  });
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title">
          <input value={form.title} onChange={(e) => set('title')(e.target.value)} className={`mt-1 w-full ${INPUT}`} />
        </Field>
        <Field label="Host">
          <input
            value={form.hostName}
            onChange={(e) => set('hostName')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>
        <Field
          label="Recurrence"
          hint="FREQ=DAILY or FREQ=WEEKLY, with optional INTERVAL, BYDAY, UNTIL, COUNT. Anything else is refused rather than guessed."
        >
          <input
            value={form.recurrenceRule}
            onChange={(e) => set('recurrenceRule')(e.target.value)}
            className={`mt-1 w-full font-mono text-xs ${INPUT}`}
          />
        </Field>
        <Field label="Start time" hint="Local wall clock, Asia/Kolkata.">
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => set('startTime')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>
        <Field label="Duration (minutes)">
          <input
            type="number"
            min={1}
            value={form.durationMinutes}
            onChange={(e) => set('durationMinutes')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>
        <Field label="Category">
          <select
            value={form.category}
            onChange={(e) => set('category')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <button
        type="button"
        disabled={pending || !form.title.trim()}
        onClick={() =>
          startTransition(async () => {
            const result = await saveSeries(form);
            setMessage(
              result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! }
            );
            if (!result.error) setForm((f) => ({ ...f, title: '', description: '' }));
          })
        }
        className={`mt-4 ${BUTTON}`}
      >
        {pending ? 'Saving…' : 'Create series'}
      </button>

      <Note message={message} />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function SeriesCard({
  series,
  canManage,
  scheduled,
}: {
  series: Series;
  canManage: boolean;
  scheduled: number;
}) {
  const [horizon, setHorizon] = useState('60');
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-[--color-line] bg-[--color-surface] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-medium">{series.title}</span>
          {!series.is_active ? (
            <span className="ml-2 rounded bg-[--color-canvas] px-2 py-0.5 text-xs font-bold uppercase text-[--color-ink-muted]">
              paused
            </span>
          ) : null}
          <span className="mt-0.5 block text-xs text-[--color-ink-muted]">
            <code className="font-mono">{series.recurrence_rule}</code> at {series.start_time} ·{' '}
            {series.duration_minutes} min · {scheduled} on the calendar
          </span>
        </div>
      </div>

      {canManage ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            max={365}
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
            aria-label="Days ahead to generate"
            className={`w-20 ${INPUT}`}
          />
          <button
            type="button"
            disabled={pending || !series.is_active}
            onClick={() =>
              startTransition(async () => {
                const result = await generateSchedule(series.id, Number(horizon) || 60);
                setMessage(
                  result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! }
                );
              })
            }
            className={BUTTON}
            title={series.is_active ? undefined : 'Resume the series first'}
          >
            Generate days ahead
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setSeriesActive(series.id, !series.is_active);
                setMessage(
                  result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! }
                );
              })
            }
            className="text-sm text-[--color-ink-muted] underline disabled:opacity-50"
          >
            {series.is_active ? 'Pause' : 'Resume'}
          </button>
          <span className="text-xs text-[--color-ink-muted]">
            Re-generating is safe — existing broadcasts are never duplicated.
          </span>
        </div>
      ) : null}

      <Note message={message} />
    </div>
  );
}
