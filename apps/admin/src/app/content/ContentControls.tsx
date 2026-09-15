'use client';

import { useState, useTransition } from 'react';
import { saveTitle, setPublishStatus, type TitleInput } from './actions';
import { daysUntil } from '../../lib/dates';

export type Title = {
  id: string;
  title: string;
  category: string | null;
  publish_status: string;
  licensor: string | null;
  territory: string;
  licensed_from: string | null;
  licensed_until: string | null;
  licence_reference: string | null;
  media_url: string | null;
  duration_seconds: number | null;
  content_warning: string | null;
};

type Message = { kind: 'error' | 'notice'; text: string } | null;

const INPUT = 'rounded-md border border-[--color-line] bg-[--color-surface] px-2.5 py-1.5 text-sm';
const BUTTON =
  'rounded-md bg-[--color-brand] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50';

const CATEGORIES = [
  { value: 'nostalgia_cinema', label: 'Nostalgia cinema' },
  { value: 'devotional_music', label: 'Devotional & classical' },
  { value: 'audiobook', label: 'Audiobooks & podcasts' },
  { value: 'live_radio', label: 'Live TV & radio' },
];

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-[--color-ok-tint] text-[--color-ok]',
  draft: 'bg-[--color-canvas] text-[--color-ink-muted]',
  scheduled: 'bg-[--color-warn-tint] text-[--color-warn]',
  withdrawn: 'bg-[--color-danger-tint] text-[--color-danger]',
};

const EMPTY: TitleInput = {
  title: '',
  category: 'nostalgia_cinema',
  licensor: '',
  territory: 'IN',
  licensedFrom: '',
  licensedUntil: '',
  licenceReference: '',
  mediaUrl: '',
  durationSeconds: '',
  contentWarning: '',
};

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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm">
      <span className="block font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-0.5 block text-xs text-[--color-ink-muted]">{hint}</span> : null}
    </label>
  );
}

// ---------------------------------------------------------------------------

/**
 * The licence fields are not optional extras on this form — they are the reason
 * it exists. `licensed_from` is required to publish because the catalogue policy
 * treats a blank one as "nobody filled this in" rather than "available forever".
 */
export function TitleEditor({ existing, onDone }: { existing?: Title; onDone?: () => void }) {
  const [form, setForm] = useState<TitleInput>(
    existing
      ? {
          title: existing.title,
          category: existing.category ?? '',
          licensor: existing.licensor ?? '',
          territory: existing.territory,
          licensedFrom: existing.licensed_from ?? '',
          licensedUntil: existing.licensed_until ?? '',
          licenceReference: existing.licence_reference ?? '',
          mediaUrl: existing.media_url ?? '',
          durationSeconds: existing.duration_seconds ? String(existing.duration_seconds) : '',
          contentWarning: existing.content_warning ?? '',
        }
      : EMPTY
  );
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof TitleInput) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title">
          <input
            value={form.title}
            onChange={(e) => set('title')(e.target.value)}
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
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Licensor" hint="Who granted the rights. Required to publish.">
          <input
            value={form.licensor}
            onChange={(e) => set('licensor')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>

        <Field label="Territory" hint="IN or WORLD. Anything else stays hidden in India.">
          <input
            value={form.territory}
            onChange={(e) => set('territory')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>

        <Field label="Licensed from" hint="Required to publish — a blank date is not perpetual.">
          <input
            type="date"
            value={form.licensedFrom}
            onChange={(e) => set('licensedFrom')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>

        <Field label="Licensed until" hint="Leave blank only for genuinely perpetual rights.">
          <input
            type="date"
            value={form.licensedUntil}
            onChange={(e) => set('licensedUntil')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>

        <Field label="Licence reference" hint="Contract or PO number, so a query has an answer.">
          <input
            value={form.licenceReference}
            onChange={(e) => set('licenceReference')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>

        <Field label="Duration (seconds)">
          <input
            type="number"
            min={1}
            value={form.durationSeconds}
            onChange={(e) => set('durationSeconds')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>

        <Field
          label="Media URL"
          hint="No provider is wired yet — see docs/CONTENT.md on DRM before a real catalogue."
        >
          <input
            value={form.mediaUrl}
            onChange={(e) => set('mediaUrl')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>

        <Field label="Content warning" hint="Shown before playback. Blank if none applies.">
          <input
            value={form.contentWarning}
            onChange={(e) => set('contentWarning')(e.target.value)}
            className={`mt-1 w-full ${INPUT}`}
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={pending || form.title.trim().length < 2}
          onClick={() =>
            startTransition(async () => {
              const result = await saveTitle(existing?.id ?? null, form);
              setMessage(
                result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! }
              );
              if (!result.error) {
                if (!existing) setForm(EMPTY);
                onDone?.();
              }
            })
          }
          className={BUTTON}
        >
          {pending ? 'Saving…' : existing ? 'Save changes' : 'Create as draft'}
        </button>
        {onDone ? (
          <button type="button" onClick={onDone} className="text-sm text-[--color-ink-muted] underline">
            Cancel
          </button>
        ) : null}
      </div>

      <Note message={message} />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function TitleRow({ title, canManage }: { title: Title; canManage: boolean }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  const from = title.licensed_from ? daysUntil(title.licensed_from) : null;
  const until = title.licensed_until ? daysUntil(title.licensed_until) : null;

  // The same conditions the RLS policy checks, so this label is what a senior
  // actually sees rather than what an operator intended.
  const visible =
    title.publish_status === 'published' &&
    from !== null &&
    from <= 0 &&
    (until === null || until >= 0) &&
    ['IN', 'WORLD'].includes(title.territory);

  const move = (status: string) =>
    startTransition(async () => {
      const result = await setPublishStatus(title.id, status);
      setMessage(result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! });
    });

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <span className="font-medium">{title.title}</span>
          <span className={`ml-2 rounded px-2 py-0.5 text-xs font-bold uppercase ${STATUS_STYLE[title.publish_status] ?? ''}`}>
            {title.publish_status}
          </span>
          {visible ? (
            <span className="ml-2 text-xs font-bold text-[--color-ok]">visible</span>
          ) : (
            <span className="ml-2 text-xs text-[--color-ink-muted]">not visible</span>
          )}
          <span className="mt-0.5 block text-xs text-[--color-ink-muted]">
            {title.licensor ?? 'no licensor recorded'} · {title.territory} ·{' '}
            {title.licensed_from ?? 'no start date'} →{' '}
            {title.licensed_until ?? 'perpetual'}
            {until !== null && until >= 0 && until <= 60 ? (
              <span className="font-bold text-[--color-warn]"> · closes in {until}d</span>
            ) : null}
            {until !== null && until < 0 ? (
              <span className="font-bold text-[--color-danger]"> · closed {Math.abs(until)}d ago</span>
            ) : null}
          </span>
          {title.content_warning ? (
            <span className="mt-0.5 block text-xs text-[--color-warn]">⚠ {title.content_warning}</span>
          ) : null}
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center gap-3">
            {title.publish_status !== 'published' ? (
              <button type="button" disabled={pending} onClick={() => move('published')} className={BUTTON}>
                Publish
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => move('withdrawn')}
                className="rounded-md border border-[--color-danger] px-3 py-1.5 text-sm font-semibold text-[--color-danger] disabled:opacity-50"
              >
                Withdraw
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="text-sm text-[--color-brand] underline"
            >
              {editing ? 'Close' : 'Edit'}
            </button>
          </div>
        ) : null}
      </div>

      <Note message={message} />

      {editing ? (
        <div className="mt-4 rounded-md border border-[--color-line] bg-[--color-canvas] p-4">
          <TitleEditor existing={title} onDone={() => setEditing(false)} />
        </div>
      ) : null}
    </div>
  );
}
