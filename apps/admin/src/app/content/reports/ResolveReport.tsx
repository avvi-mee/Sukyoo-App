'use client';

import { useState, useTransition } from 'react';
import { resolveReport } from '../actions';

export function ResolveReport({ reportId }: { reportId: string }) {
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<{ kind: 'error' | 'notice'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const resolve = (status: 'actioned' | 'dismissed') =>
    startTransition(async () => {
      const result = await resolveReport(reportId, status, note);
      setMessage(result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! });
      if (!result.error) setNote('');
    });

  return (
    <div className="mt-3">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What did you do, or why not?"
        aria-label="Resolution note"
        className="w-full rounded-md border border-[--color-line] bg-[--color-surface] px-2.5 py-1.5 text-sm"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || note.trim().length < 10}
          onClick={() => resolve('actioned')}
          className="rounded-md bg-[--color-brand] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Actioned
        </button>
        <button
          type="button"
          disabled={pending || note.trim().length < 10}
          onClick={() => resolve('dismissed')}
          className="rounded-md border border-[--color-line] px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
        >
          Dismiss
        </button>
        <span className="text-xs text-[--color-ink-muted]">
          {/* The note is required in the RPC, not just here — a resolution
              with no record of what was done is how the same complaint gets
              dismissed three times. */}
          A note of at least 10 characters is required either way.
        </span>
      </div>

      {message ? (
        <p
          role="alert"
          className={`mt-2 text-sm ${
            message.kind === 'error' ? 'text-[--color-danger]' : 'text-[--color-ok]'
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
