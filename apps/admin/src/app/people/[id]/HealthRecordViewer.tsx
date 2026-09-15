'use client';

import { useState, useTransition } from 'react';
import { AUDIT_REASONS, AUDIT_REASON_LABEL, type AuditReason } from '../../../lib/permissions';
import { fetchHealth } from './actions';

const RESOURCES = [
  { key: 'vitals', label: 'Readings' },
  { key: 'medication', label: 'Medicines' },
  { key: 'health_record', label: 'Reports' },
  { key: 'insurance_claim', label: 'Claims' },
] as const;

/**
 * Health data is NOT rendered on page load. Staff must pick a record type, pick
 * a reason and write a note first.
 *
 * That friction is the feature. A console that shows a senior's blood sugar the
 * moment you open their profile produces an audit log full of accidental reads,
 * which makes the log useless for answering "who looked at my records?" — the
 * exact question the DPDP Act gives that person the right to ask.
 */
export function HealthRecordViewer({ ownerId, personName }: { ownerId: string; personName: string }) {
  const [resource, setResource] = useState<string>('vitals');
  const [reason, setReason] = useState<AuditReason>('support_request');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<unknown[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRows(null);
    startTransition(async () => {
      const result = await fetchHealth({ ownerId, resource, reason, reasonNote: note });
      if ('error' in result) setError(result.error);
      else setRows(result.data);
    });
  }

  return (
    <div className="rounded-lg border border-[--color-warn] bg-[--color-warn-tint] p-5">
      <p className="text-sm font-bold text-[--color-warn]">
        Opening {personName}&rsquo;s health records is recorded against your name
      </p>
      <p className="mt-1 text-sm text-[--color-warn]">
        {personName} can see who accessed their records and why. Only continue if you have a reason you would be
        comfortable explaining to them.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {RESOURCES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={resource === r.key}
              onClick={() => setResource(r.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                resource === r.key
                  ? 'bg-[--color-ink] text-white'
                  : 'border border-[--color-line] bg-[--color-surface] text-[--color-ink]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-[--color-ink]">
            Reason
          </label>
          <select
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value as AuditReason)}
            className="mt-1 w-full max-w-md rounded-md border border-[--color-line] bg-[--color-surface] px-3 py-2 text-sm"
          >
            {AUDIT_REASONS.map((r) => (
              <option key={r} value={r}>
                {AUDIT_REASON_LABEL[r]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="note" className="block text-sm font-medium text-[--color-ink]">
            What specifically are you looking for?{' '}
            <span className="font-normal">(at least 10 characters, stored with your name)</span>
          </label>
          <textarea
            id="note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ticket #482 — she reports her sugar reading looks wrong in the app."
            className="mt-1 w-full max-w-md rounded-md border border-[--color-line] bg-[--color-surface] px-3 py-2 text-sm"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm font-semibold text-[--color-danger]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || note.trim().length < 10}
          className="rounded-md bg-[--color-ink] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Opening…' : 'Open records'}
        </button>
      </form>

      {rows ? (
        <div className="mt-5 rounded-md border border-[--color-line] bg-[--color-surface] p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[--color-ink-muted]">
            {rows.length} record{rows.length === 1 ? '' : 's'} · this access has been logged
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-[--color-ink-muted]">Nothing recorded for this person.</p>
          ) : (
            // Rendered as JSON deliberately: the four record types have very
            // different shapes, and a per-type table is presentation work that
            // shouldn't gate the audited-read path being correct. Worth
            // replacing once the shapes settle.
            <pre className="max-h-96 overflow-auto text-xs leading-relaxed">
              {JSON.stringify(rows, null, 2)}
            </pre>
          )}
        </div>
      ) : null}
    </div>
  );
}
