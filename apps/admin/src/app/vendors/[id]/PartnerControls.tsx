'use client';

import { useState, useTransition } from 'react';
import {
  addRateCard,
  approvePayoutRun,
  buildPayoutRun,
  documentUrl,
  reviewDocument,
  setPartnerStatus,
} from '../actions';
import { STATUS_LABEL } from '../labels';

type Message = { kind: 'error' | 'notice'; text: string } | null;

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

const INPUT =
  'rounded-md border border-[--color-line] bg-[--color-surface] px-2.5 py-1.5 text-sm';
const BUTTON =
  'rounded-md bg-[--color-brand] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50';

// ---------------------------------------------------------------------------

/**
 * Status transitions. Every one requires a note, and the note goes to audit_log
 * inside set_partner_status() — so "why was this partner suspended in March" has
 * an answer without asking anyone.
 */
export function StatusControl({
  orgId,
  current,
  blocking,
}: {
  orgId: string;
  current: string;
  blocking: number;
}) {
  const [status, setStatus] = useState(current);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  const dangerous = status === 'suspended' || status === 'rejected';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="partner-status" className="text-sm font-medium">
          Move to
        </label>
        <select
          id="partner-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={INPUT}
        >
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {status === 'approved' && blocking > 0 ? (
        <p className="mt-2 text-sm text-[--color-warn]">
          {blocking} mandatory document{blocking === 1 ? '' : 's'} still outstanding. The database will refuse this,
          so verify the paperwork first.
        </p>
      ) : null}
      {status === 'approved' && blocking === 0 ? (
        <p className="mt-2 text-sm text-[--color-ink-muted]">
          This makes their listings visible to every senior on the platform.
        </p>
      ) : null}
      {dangerous ? (
        <p className="mt-2 text-sm text-[--color-danger]">
          This removes their listings from both apps immediately and blocks new orders for products already on
          screen.
        </p>
      ) : null}

      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Why — this is written to the audit trail"
        aria-label="Reason for this status change"
        className={`mt-3 w-full ${INPUT}`}
      />

      <button
        type="button"
        disabled={pending || note.trim().length < 10}
        onClick={() =>
          startTransition(async () => {
            const result = await setPartnerStatus(orgId, status, note);
            setMessage(
              result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! }
            );
            if (!result.error) setNote('');
          })
        }
        className={`mt-2 ${dangerous ? BUTTON.replace('bg-[--color-brand]', 'bg-[--color-danger]') : BUTTON}`}
      >
        {pending ? 'Saving…' : `Set to ${STATUS_LABEL[status] ?? status}`}
      </button>

      <Note message={message} />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function DocumentRow({
  orgId,
  doc,
  label,
  badgeClass,
  daysLeft,
  canManage,
}: {
  orgId: string;
  doc: {
    id: string;
    document_number: string | null;
    issued_on: string | null;
    expires_on: string | null;
    review_status: string;
    review_note: string | null;
    uploaded_at: string;
  };
  label: string;
  badgeClass: string;
  daysLeft: number | null;
  canManage: boolean;
}) {
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  const open = () =>
    startTransition(async () => {
      const result = await documentUrl(doc.id);
      if (result.error) setMessage({ kind: 'error', text: result.error });
      // A new tab rather than an inline preview: the URL is a two-minute
      // capability to a PAN card, and embedding it would leave it in this
      // page's DOM for as long as the tab stays open.
      else window.open(result.url, '_blank', 'noopener,noreferrer');
    });

  const review = (status: 'verified' | 'rejected' | 'expired') =>
    startTransition(async () => {
      const result = await reviewDocument(orgId, doc.id, status, note);
      setMessage(result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! });
      if (!result.error) setNote('');
    });

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-medium">{label}</span>
          {doc.document_number ? (
            <span className="ml-2 font-mono text-xs text-[--color-ink-muted]">{doc.document_number}</span>
          ) : null}
          <span className="ml-2 text-xs text-[--color-ink-muted]">
            uploaded {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}
            {doc.expires_on ? ` · expires ${doc.expires_on}` : ' · no expiry'}
          </span>
          {daysLeft !== null && daysLeft < 0 ? (
            <span className="ml-2 text-xs font-bold text-[--color-danger]">
              expired {Math.abs(daysLeft)}d ago
            </span>
          ) : daysLeft !== null && daysLeft <= 45 ? (
            <span className="ml-2 text-xs font-bold text-[--color-warn]">{daysLeft}d left</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${badgeClass}`}>
            {doc.review_status}
          </span>
          <button
            type="button"
            onClick={open}
            disabled={pending}
            className="text-sm text-[--color-brand] underline disabled:opacity-50"
          >
            Open file
          </button>
        </div>
      </div>

      {doc.review_note ? (
        <p className="mt-1 text-sm text-[--color-ink-muted]">Note: {doc.review_note}</p>
      ) : null}

      {canManage ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Review note (required to reject)"
            aria-label={`Review note for ${label}`}
            className={`min-w-64 flex-1 ${INPUT}`}
          />
          <button type="button" disabled={pending} onClick={() => review('verified')} className={BUTTON}>
            Verify
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => review('rejected')}
            className="rounded-md border border-[--color-danger] px-3 py-1.5 text-sm font-semibold text-[--color-danger] disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => review('expired')}
            className="text-sm text-[--color-ink-muted] underline disabled:opacity-50"
          >
            Mark expired
          </button>
        </div>
      ) : null}

      <Note message={message} />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function RateCardForm({
  orgId,
  categories,
}: {
  orgId: string;
  categories: { id: string; name: string }[];
}) {
  const [rate, setRate] = useState('');
  const [from, setFrom] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="border-t border-[--color-line] pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block font-medium">Rate %</span>
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className={`mt-1 w-24 ${INPUT}`}
          />
        </label>
        <label className="text-sm">
          <span className="block font-medium">Applies from</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={`mt-1 ${INPUT}`}
          />
        </label>
        <label className="text-sm">
          <span className="block font-medium">Category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`mt-1 ${INPUT}`}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={pending || !rate || !from}
          onClick={() =>
            startTransition(async () => {
              const result = await addRateCard(orgId, Number(rate), from, categoryId || null);
              setMessage(
                result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! }
              );
              if (!result.error) setRate('');
            })
          }
          className={BUTTON}
        >
          {pending ? 'Adding…' : 'Add rate'}
        </button>
      </div>
      <Note message={message} />
    </div>
  );
}

// ---------------------------------------------------------------------------

type Run = {
  id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  commission_amount: number;
  payable_amount: number;
  status: string;
  created_by: string | null;
  approved_at: string | null;
  reference: string | null;
};

export function PayoutPanel({
  orgId,
  runs,
  staffUserId,
  canFinance,
  unpaidPayable,
}: {
  orgId: string;
  runs: Run[];
  staffUserId: string;
  canFinance: boolean;
  unpaidPayable: number;
}) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reference, setReference] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  const money = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      {runs.length === 0 ? (
        <p className="text-sm text-[--color-ink-muted]">
          No payout runs yet. {money(unpaidPayable)} of commission is unclaimed by any run.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-[--color-ink-muted]">
              <tr>
                <th className="py-2">Period</th>
                <th className="py-2">Gross</th>
                <th className="py-2">Our commission</th>
                <th className="py-2">Payable</th>
                <th className="py-2">Status</th>
                {canFinance ? <th className="py-2">Approve</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-line]">
              {runs.map((run) => {
                // Separation of duties is enforced in approve_payout_run(), which
                // raises if creator = approver. Disabling the button here just
                // saves the operator a pointless round trip and explains why.
                const ownRun = run.created_by === staffUserId;
                return (
                  <tr key={run.id}>
                    <td className="py-2 tabular-nums">
                      {run.period_start} → {run.period_end}
                    </td>
                    <td className="py-2 tabular-nums">{money(run.gross_amount)}</td>
                    <td className="py-2 tabular-nums text-[--color-ink-muted]">
                      {money(run.commission_amount)}
                    </td>
                    <td className="py-2 font-medium tabular-nums">{money(run.payable_amount)}</td>
                    <td className="py-2">
                      {run.status}
                      {run.reference ? (
                        <span className="block font-mono text-xs text-[--color-ink-muted]">{run.reference}</span>
                      ) : null}
                    </td>
                    {canFinance ? (
                      <td className="py-2">
                        {run.status !== 'draft' ? (
                          <span className="text-xs text-[--color-ink-muted]">
                            {run.approved_at ? new Date(run.approved_at).toLocaleDateString('en-IN') : '—'}
                          </span>
                        ) : ownRun ? (
                          <span className="text-xs text-[--color-ink-muted]">
                            You built this — someone else must approve it
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <input
                              value={reference[run.id] ?? ''}
                              onChange={(e) =>
                                setReference((prev) => ({ ...prev, [run.id]: e.target.value }))
                              }
                              placeholder="Bank ref"
                              aria-label="Bank reference"
                              className={`w-28 ${INPUT}`}
                            />
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() =>
                                startTransition(async () => {
                                  const result = await approvePayoutRun(
                                    orgId,
                                    run.id,
                                    reference[run.id] ?? ''
                                  );
                                  setMessage(
                                    result.error
                                      ? { kind: 'error', text: result.error }
                                      : { kind: 'notice', text: result.notice! }
                                  );
                                })
                              }
                              className={BUTTON}
                            >
                              Approve
                            </button>
                          </span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canFinance ? (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[--color-line] pt-4">
          <label className="text-sm">
            <span className="block font-medium">Period start</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={`mt-1 ${INPUT}`}
            />
          </label>
          <label className="text-sm">
            <span className="block font-medium">Period end</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={`mt-1 ${INPUT}`}
            />
          </label>
          <button
            type="button"
            disabled={pending || !start || !end}
            onClick={() =>
              startTransition(async () => {
                const result = await buildPayoutRun(orgId, start, end);
                setMessage(
                  result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! }
                );
              })
            }
            className={BUTTON}
          >
            {pending ? 'Building…' : 'Build draft run'}
          </button>
          <p className="w-full text-xs text-[--color-ink-muted]">
            Building a run claims every unpaid commission row in the period onto it, which is what stops the same
            commission being paid twice. It cannot be approved by whoever built it.
          </p>
        </div>
      ) : null}

      <Note message={message} />
    </div>
  );
}
