'use client';

import { useState, useTransition } from 'react';
import {
  approveRequest,
  executeErasure,
  generateExport,
  markVerifying,
  rejectRequest,
  setDueBy,
} from './actions';
import { daysUntil } from '../../lib/dates';
import type { DsrRow } from './page';

type Message = { kind: 'error' | 'notice'; text: string } | null;

const INPUT = 'rounded-md border border-[--color-line] bg-[--color-surface] px-2.5 py-1.5 text-sm';
const BUTTON =
  'rounded-md bg-[--color-brand] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50';
const DANGER =
  'rounded-md bg-[--color-danger] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50';

const TYPE_LABEL: Record<string, string> = {
  export: 'Copy of their data',
  erasure: 'Erase their data',
  correction: 'Correct their data',
};

export function RequestCard({
  request,
  canManage,
  staffUserId,
}: {
  request: DsrRow;
  canManage: boolean;
  staffUserId: string;
}) {
  const [note, setNote] = useState('');
  const [due, setDue] = useState(request.due_by ?? '');
  const [confirmErasure, setConfirmErasure] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ error?: string; notice?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      setMessage(result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! });
      if (!result.error) {
        setNote('');
        setConfirmErasure(false);
      }
    });

  const days = request.due_by ? daysUntil(request.due_by) : null;
  const isErasure = request.request_type === 'erasure';
  // The RPC refuses this too. Showing it as a sentence rather than a disabled
  // button means the second operator knows why they are needed.
  const ownApproval = request.approved_by === staffUserId;

  return (
    <div
      className={`rounded-lg border bg-[--color-surface] p-4 ${
        days !== null && days < 0 ? 'border-[--color-danger]' : 'border-[--color-line]'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-medium">{TYPE_LABEL[request.request_type] ?? request.request_type}</span>
          <span
            className={`ml-2 rounded px-2 py-0.5 text-xs font-bold uppercase ${
              request.status === 'approved'
                ? 'bg-[--color-ok-tint] text-[--color-ok]'
                : 'bg-[--color-warn-tint] text-[--color-warn]'
            }`}
          >
            {request.status}
          </span>
          <span className="mt-0.5 block text-xs text-[--color-ink-muted]">
            {request.subject?.full_name ?? 'unnamed'}
            {request.subject?.phone ? ` · ${request.subject.phone}` : ''} · raised{' '}
            {new Date(request.created_at).toLocaleDateString('en-IN')} ·{' '}
            {request.raised_via === 'self_service'
              ? 'raised in the app'
              : 'recorded by ops — identity NOT yet proven'}
          </span>
          {days !== null ? (
            <span
              className={`mt-0.5 block text-xs font-bold ${
                days < 0 ? 'text-[--color-danger]' : days <= 3 ? 'text-[--color-warn]' : 'text-[--color-ink-muted]'
              }`}
            >
              {days < 0 ? `${Math.abs(days)} days overdue` : `due in ${days} days`}
            </span>
          ) : null}
        </div>
      </div>

      {request.subject_note ? (
        <p className="mt-2 rounded-md bg-[--color-canvas] px-3 py-2 text-sm">{request.subject_note}</p>
      ) : null}

      {isErasure && request.status === 'approved' ? (
        <div className="mt-3 rounded-md border border-[--color-danger] bg-[--color-danger-tint] p-3 text-sm text-[--color-danger]">
          <p className="font-bold">This will permanently destroy their health data.</p>
          <p className="mt-1">
            Vitals, medicines, reports, life stories, emergency contacts, SOS history and family links are deleted.
            Orders and the audit trail are kept — the financial record for tax, the audit trail because deleting the
            record of who accessed what would defeat the point of having it.
          </p>
          <p className="mt-1">
            The stored FILES in health-records and life-stories are not reachable from the database and must be
            deleted from storage separately.
          </p>
        </div>
      ) : null}

      {canManage ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="block font-medium">Due by</span>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className={`mt-1 ${INPUT}`}
              />
            </label>
            <button
              type="button"
              disabled={pending || !due}
              onClick={() => run(() => setDueBy(request.id, due))}
              className="rounded-md border border-[--color-line] px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              Set
            </button>
          </div>

          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              request.status === 'approved'
                ? 'What was done?'
                : 'How was the requester identified? This is the only control between a stolen session and their data.'
            }
            aria-label="Note"
            className={`w-full ${INPUT}`}
          />

          <div className="flex flex-wrap items-center gap-2">
            {request.status === 'received' ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => markVerifying(request.id))}
                className="rounded-md border border-[--color-line] px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
              >
                Start verifying
              </button>
            ) : null}

            {['received', 'verifying'].includes(request.status) ? (
              <button
                type="button"
                disabled={pending || note.trim().length < 10}
                onClick={() => run(() => approveRequest(request.id, note))}
                className={BUTTON}
              >
                Identity verified — approve
              </button>
            ) : null}

            {request.status === 'approved' && request.request_type === 'export' ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => generateExport(request.id))}
                className={BUTTON}
              >
                {request.export_ready ? 'Regenerate export' : 'Generate export'}
              </button>
            ) : null}

            {request.status === 'approved' && isErasure ? (
              ownApproval ? (
                <span className="text-sm text-[--color-ink-muted]">
                  You approved this request, so somebody else must execute the erasure.
                </span>
              ) : !confirmErasure ? (
                <button
                  type="button"
                  disabled={pending || note.trim().length < 10}
                  onClick={() => setConfirmErasure(true)}
                  className={DANGER}
                >
                  Execute erasure…
                </button>
              ) : (
                <>
                  <span className="text-sm font-bold text-[--color-danger]">
                    This cannot be undone. Are you sure?
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => executeErasure(request.id, note))}
                    className={DANGER}
                  >
                    {pending ? 'Erasing…' : 'Yes, erase permanently'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmErasure(false)}
                    className="text-sm text-[--color-ink-muted] underline"
                  >
                    Cancel
                  </button>
                </>
              )
            ) : null}

            <button
              type="button"
              disabled={pending || note.trim().length < 10}
              onClick={() => run(() => rejectRequest(request.id, note))}
              className="text-sm font-semibold text-[--color-danger] underline disabled:opacity-50"
            >
              Reject
            </button>
          </div>

          {request.export_ready ? (
            <p className="text-xs text-[--color-ink-muted]">
              The export is ready and the person can collect it in their own app. This console does not download it —
              a copy of somebody&rsquo;s entire health record does not belong on a staff laptop.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[--color-ink-muted]">
          Actioning a request needs the compliance.manage permission.
        </p>
      )}

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
