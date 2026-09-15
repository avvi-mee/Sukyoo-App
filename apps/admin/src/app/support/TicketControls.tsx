'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { assignToMe, reply, setPriority, setTicketStatus } from './actions';
import type { Ticket } from './page';

type Message = { kind: 'error' | 'notice'; text: string } | null;

const INPUT = 'rounded-md border border-[--color-line] bg-[--color-surface] px-2.5 py-1.5 text-sm';
const BUTTON =
  'rounded-md bg-[--color-brand] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50';

const PRIORITY_STYLE: Record<string, string> = {
  urgent: 'bg-[--color-danger-tint] text-[--color-danger]',
  normal: 'bg-[--color-canvas] text-[--color-ink-muted]',
  low: 'bg-[--color-canvas] text-[--color-ink-muted]',
};

export function TicketCard({
  ticket,
  canManage,
  staffUserId,
}: {
  ticket: Ticket;
  canManage: boolean;
  staffUserId: string;
}) {
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [open, setOpen] = useState(ticket.priority === 'urgent');
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ error?: string; notice?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      setMessage(result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! });
      if (!result.error) setBody('');
    });

  const messages = [...ticket.support_messages].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
  );

  return (
    <div
      className={`rounded-lg border bg-[--color-surface] p-4 ${
        ticket.priority === 'urgent' ? 'border-[--color-danger]' : 'border-[--color-line]'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-medium">{ticket.subject}</span>
          <span
            className={`ml-2 rounded px-2 py-0.5 text-xs font-bold uppercase ${PRIORITY_STYLE[ticket.priority] ?? ''}`}
          >
            {ticket.priority}
          </span>
          <span className="ml-2 text-xs text-[--color-ink-muted]">{ticket.status.replace(/_/g, ' ')}</span>
          <span className="mt-0.5 block text-xs text-[--color-ink-muted]">
            {ticket.raiser?.full_name ?? 'unknown'}
            {ticket.raiser?.phone ? ` · ${ticket.raiser.phone}` : ''} ·{' '}
            {new Date(ticket.created_at).toLocaleDateString('en-IN')}
            {ticket.agent?.full_name ? ` · ${ticket.agent.full_name}` : ' · unassigned'}
          </span>
          {ticket.about ? (
            <span className="mt-0.5 block text-xs text-[--color-ink-muted]">
              About{' '}
              <Link href={`/people/${ticket.about.id}`} className="text-[--color-brand] underline">
                {ticket.about.full_name ?? 'this person'}
              </Link>
              {/* Reading their health data from there is reason-gated and audited,
                  which is why this is a link rather than an inline summary. */}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm text-[--color-brand] underline"
        >
          {open ? 'Collapse' : `${messages.length} message${messages.length === 1 ? '' : 's'}`}
        </button>
      </div>

      {open ? (
        <>
          <div className="mt-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-sm text-[--color-ink-muted]">No messages yet.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-md px-3 py-2 text-sm ${
                    m.is_internal
                      ? 'border border-dashed border-[--color-warn] bg-[--color-warn-tint]'
                      : m.author_id === ticket.raised_by
                        ? 'bg-[--color-canvas]'
                        : 'bg-[--color-brand-tint]'
                  }`}
                >
                  {m.is_internal ? (
                    <span className="mb-0.5 block text-xs font-bold uppercase text-[--color-warn]">
                      Internal — not visible to the user
                    </span>
                  ) : null}
                  {m.body}
                  <span className="mt-0.5 block text-xs text-[--color-ink-muted]">
                    {new Date(m.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
              ))
            )}
          </div>

          {canManage ? (
            <div className="mt-3 space-y-2">
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={internal ? 'Note for the team…' : 'Reply to the user…'}
                aria-label={internal ? 'Internal note' : 'Reply'}
                className={`w-full ${INPUT}`}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                />
                <span>Internal note (the user will never see this)</span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pending || body.trim().length < 2}
                  onClick={() => run(() => reply(ticket.id, body, internal))}
                  className={BUTTON}
                >
                  {internal ? 'Add note' : 'Send reply'}
                </button>
                {!ticket.assigned_to || ticket.assigned_to !== staffUserId ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => assignToMe(ticket.id))}
                    className="rounded-md border border-[--color-line] px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
                  >
                    Assign to me
                  </button>
                ) : null}
                <select
                  value={ticket.priority}
                  onChange={(e) => run(() => setPriority(ticket.id, e.target.value))}
                  aria-label="Priority"
                  className={INPUT}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => setTicketStatus(ticket.id, 'resolved'))}
                  className="text-sm font-semibold text-[--color-ok] underline disabled:opacity-50"
                >
                  Resolve
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

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
