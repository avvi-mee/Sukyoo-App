'use client';

import { useState, useTransition } from 'react';
import { applyCatalogue, previewCatalogue, type Change, type Diff } from './actions';

const BUTTON =
  'rounded-md bg-[--color-brand] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50';

export function CatalogueImport({ orgId }: { orgId: string }) {
  const [csv, setCsv] = useState('');
  const [diff, setDiff] = useState<Diff | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'notice'; text: string } | null>(null);
  const [delistMissing, setDelistMissing] = useState(false);
  const [pending, startTransition] = useTransition();

  // The preview is cleared whenever the file changes, so the Apply button can
  // never be pressed against a diff that describes different text.
  const onCsvChange = (text: string) => {
    setCsv(text);
    setDiff(null);
    setMessage(null);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onCsvChange(String(reader.result ?? ''));
    reader.onerror = () => setMessage({ kind: 'error', text: 'Could not read that file.' });
    reader.readAsText(file);
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) readFile(file);
        }}
        className="mb-3 block text-sm"
        aria-label="Choose a CSV file"
      />

      <textarea
        rows={8}
        value={csv}
        onChange={(e) => onCsvChange(e.target.value)}
        placeholder={'name,category,price,description,is_active,requires_prescription\nDolo 650,medicines,32.00,Paracetamol 650mg,true,false'}
        aria-label="Catalogue CSV"
        className="w-full rounded-md border border-[--color-line] bg-[--color-surface] p-3 font-mono text-xs"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !csv.trim()}
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              setDiff(await previewCatalogue(orgId, csv));
            })
          }
          className={BUTTON}
        >
          {pending && !diff ? 'Checking…' : 'Preview changes'}
        </button>
        {diff ? (
          <span className="text-sm text-[--color-ink-muted]">
            {diff.counts.create} new · {diff.counts.update} changed · {diff.counts.unchanged} unchanged ·{' '}
            {diff.counts.delist} missing from file
          </span>
        ) : null}
      </div>

      {diff?.errors.length ? (
        <div className="mt-4 rounded-md border border-[--color-danger] bg-[--color-danger-tint] p-3">
          <p className="text-sm font-bold text-[--color-danger]">
            {diff.errors.length} problem{diff.errors.length === 1 ? '' : 's'} — nothing can be imported until these
            are fixed
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-[--color-danger]">
            {diff.errors.slice(0, 25).map((e) => (
              <li key={`${e.line}-${e.message}`}>
                {e.line > 0 ? `Line ${e.line}: ` : ''}
                {e.message}
              </li>
            ))}
            {diff.errors.length > 25 ? <li>…and {diff.errors.length - 25} more.</li> : null}
          </ul>
        </div>
      ) : null}

      {diff && diff.errors.length === 0 ? (
        <>
          <ChangeList changes={diff.changes} />

          {diff.counts.delist > 0 ? (
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={delistMissing}
                onChange={(e) => setDelistMissing(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Also hide the {diff.counts.delist} listing{diff.counts.delist === 1 ? '' : 's'} missing from this
                file.{' '}
                <span className="text-[--color-ink-muted]">
                  They are marked inactive, never deleted — past orders point at them.
                </span>
              </span>
            </label>
          ) : null}

          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await applyCatalogue(orgId, csv, delistMissing);
                setMessage(
                  result.error
                    ? { kind: 'error', text: result.error }
                    : { kind: 'notice', text: result.notice! }
                );
                if (!result.error) setDiff(null);
              })
            }
            className={`mt-4 ${BUTTON}`}
          >
            {pending ? 'Importing…' : 'Apply these changes'}
          </button>
          <p className="mt-1 text-xs text-[--color-ink-muted]">
            The file is re-checked on the server when you apply, so if the catalogue changed since this preview you
            get the newer result rather than this one.
          </p>
        </>
      ) : null}

      {message ? (
        <p
          role="alert"
          className={`mt-3 text-sm ${
            message.kind === 'error' ? 'text-[--color-danger]' : 'text-[--color-ok]'
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

const money = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function ChangeList({ changes }: { changes: Change[] }) {
  // Unchanged rows are counted but not listed. In a 400-row catalogue where two
  // prices moved, printing 398 "no change" lines hides the two that matter.
  const notable = changes.filter((c) => c.kind !== 'unchanged');
  if (notable.length === 0) {
    return (
      <p className="mt-4 text-sm text-[--color-ink-muted]">
        The catalogue already matches this file exactly.
      </p>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-[--color-line] rounded-md border border-[--color-line] text-sm">
      {notable.map((c, i) => (
        <li key={i} className="flex flex-wrap items-baseline gap-2 px-3 py-2">
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase ${
              c.kind === 'create'
                ? 'bg-[--color-ok-tint] text-[--color-ok]'
                : c.kind === 'delist'
                  ? 'bg-[--color-danger-tint] text-[--color-danger]'
                  : 'bg-[--color-warn-tint] text-[--color-warn]'
            }`}
          >
            {c.kind === 'delist' ? 'missing' : c.kind}
          </span>

          {c.kind === 'create' ? (
            <span>
              <span className="font-medium">{c.row.name}</span> — {money(c.row.price)}, {c.row.category}
              {c.row.requiresPrescription ? (
                <span className="text-[--color-warn]"> · prescription-only, will be withheld</span>
              ) : null}
            </span>
          ) : c.kind === 'delist' ? (
            <span>
              <span className="font-medium">{c.before.name}</span> — currently listed at{' '}
              {money(c.before.price)}, not in this file
            </span>
          ) : (
            <span>
              <span className="font-medium">{c.row.name}</span>
              {c.fields.includes('price') ? (
                <span>
                  {' '}
                  — {money(c.before.price)} → <strong>{money(c.row.price)}</strong>
                </span>
              ) : null}
              {c.fields.filter((f) => f !== 'price').length > 0 ? (
                <span className="text-[--color-ink-muted]">
                  {' '}
                  — {c.fields.filter((f) => f !== 'price').join(', ')} changed
                </span>
              ) : null}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
