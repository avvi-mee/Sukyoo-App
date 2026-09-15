import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';
import { Shell } from '../../components/Shell';
import { can } from '../../lib/permissions';
import { TicketCard } from './TicketControls';

export const dynamic = 'force-dynamic';

export type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  raised_by: string;
  raiser: { full_name: string | null; phone: string | null } | null;
  about: { id: string; full_name: string | null } | null;
  agent: { full_name: string | null } | null;
  support_messages: {
    id: string;
    body: string;
    is_internal: boolean;
    created_at: string;
    author_id: string;
  }[];
};

const OPEN = ['open', 'waiting_on_user'];
// Urgent first, then oldest. "Her SOS button did nothing" is a different problem
// from "the text is small", and a queue sorted only by time buries it.
const PRIORITY_RANK = { urgent: 0, normal: 1, low: 2 } as const;

export default async function SupportPage() {
  const staff = await requirePermission('support.read');
  const supabase = await createClient();

  const { data } = await supabase
    .from('support_tickets')
    .select(
      `id, subject, category, status, priority, assigned_to, created_at, updated_at, raised_by,
       raiser:profiles!support_tickets_raised_by_fkey(full_name, phone),
       about:profiles!support_tickets_about_user_id_fkey(id, full_name),
       agent:profiles!support_tickets_assigned_to_fkey(full_name),
       support_messages(id, body, is_internal, created_at, author_id)`
    )
    .order('created_at', { ascending: true })
    .limit(200);

  const all = (data ?? []) as unknown as Ticket[];
  const open = all
    .filter((t) => OPEN.includes(t.status))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority as keyof typeof PRIORITY_RANK] -
        PRIORITY_RANK[b.priority as keyof typeof PRIORITY_RANK]
    );
  const closed = all.filter((t) => !OPEN.includes(t.status)).reverse();
  const canManage = can(staff, 'support.manage');

  const urgent = open.filter((t) => t.priority === 'urgent');
  const unassigned = open.filter((t) => !t.assigned_to);

  return (
    <Shell staff={staff}>
      <header className="mb-6">
        <h1 className="text-xl font-bold">Support</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          Tickets from seniors and their family. Urgent ones sort to the top regardless of age. Internal notes are
          hidden from the user by the database, not by this page.
        </p>
      </header>

      {urgent.length > 0 ? (
        <div className="mb-6 rounded-lg border border-[--color-danger] bg-[--color-danger-tint] p-4 text-sm text-[--color-danger]">
          <p className="font-bold">
            {urgent.length} urgent ticket{urgent.length === 1 ? '' : 's'}
          </p>
          <p className="mt-1">
            Anything reported about the SOS button or a missed emergency alert belongs here. If a real alert failed,
            check the SOS queue&rsquo;s delivery counts before replying.
          </p>
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Open" value={String(open.length)} />
        <Stat label="Unassigned" value={String(unassigned.length)} />
        <Stat label="Urgent" value={String(urgent.length)} />
      </div>

      {open.length === 0 ? (
        <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-6 text-sm text-[--color-ink-muted]">
          Nothing open.
        </p>
      ) : (
        <div className="space-y-3">
          {open.map((t) => (
            <TicketCard key={t.id} ticket={t} canManage={canManage} staffUserId={staff.userId} />
          ))}
        </div>
      )}

      {closed.length > 0 ? (
        <>
          <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
            Closed
          </h2>
          <div className="divide-y divide-[--color-line] rounded-lg border border-[--color-line] bg-[--color-surface]">
            {closed.map((t) => (
              <div key={t.id} className="px-4 py-3 text-sm">
                <span className="font-medium">{t.subject}</span>
                <span className="text-[--color-ink-muted]">
                  {' '}
                  — {t.raiser?.full_name ?? 'unknown'} · {t.status}
                  {t.agent?.full_name ? ` · handled by ${t.agent.full_name}` : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[--color-line] bg-[--color-surface] p-5">
      <p className="text-sm text-[--color-ink-muted]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
