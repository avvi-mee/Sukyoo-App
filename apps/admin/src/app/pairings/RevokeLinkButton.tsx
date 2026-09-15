'use client';

import { useState, useTransition } from 'react';
import { requestLinkRevocation } from './actions';

export function RevokeLinkButton({ linkId }: { linkId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<{ kind: 'error' | 'notice'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm font-semibold text-[--color-danger] underline">
        Revoke
      </button>
    );
  }

  return (
    <div className="min-w-64">
      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Why is this being revoked?"
        aria-label="Reason for revoking this pairing"
        className="w-full rounded-md border border-[--color-line] px-2 py-1 text-sm"
      />
      <div className="mt-2 flex gap-2">
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await requestLinkRevocation(linkId, note);
              if (result.error) setMessage({ kind: 'error', text: result.error });
              else if (result.notice) {
                setMessage({ kind: 'notice', text: result.notice });
                setNote('');
              }
            })
          }
          className="rounded-md bg-[--color-danger] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Logging…' : 'Log request'}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs font-semibold text-[--color-ink-muted] underline">
          Cancel
        </button>
      </div>

      {message ? (
        <p
          role="alert"
          className={`mt-2 text-xs ${
            message.kind === 'error' ? 'text-[--color-danger]' : 'text-[--color-ink-muted]'
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
