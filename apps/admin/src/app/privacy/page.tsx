import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';
import { Shell } from '../../components/Shell';
import { can } from '../../lib/permissions';
import { daysUntil } from '../../lib/dates';
import { RequestCard } from './RequestControls';

export const dynamic = 'force-dynamic';

export type DsrRow = {
  id: string;
  subject_id: string;
  request_type: string;
  status: string;
  raised_via: string;
  subject_note: string | null;
  due_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  completed_at: string | null;
  resolution_note: string | null;
  created_at: string;
  export_ready: boolean;
  subject: { full_name: string | null; phone: string | null } | null;
};

const OPEN = ['received', 'verifying', 'approved'];

export default async function PrivacyPage() {
  const staff = await requirePermission('compliance.read');
  const supabase = await createClient();

  const [{ data: requests }, { data: erasures }] = await Promise.all([
    supabase
      .from('data_subject_requests')
      .select(
        `id, subject_id, request_type, status, raised_via, subject_note, due_by,
         approved_by, approved_at, completed_at, resolution_note, created_at,
         export_payload,
         subject:profiles!data_subject_requests_subject_id_fkey(full_name, phone)`
      )
      .order('created_at', { ascending: true })
      .limit(300),
    supabase
      .from('erasure_log')
      .select('id, request_id, subject_id, rows_removed, executed_at')
      .order('executed_at', { ascending: false })
      .limit(50),
  ]);

  // export_payload can be a whole person's record. It is reduced to a boolean
  // here so it never reaches the browser — the person collects it in their own
  // app, and this console only needs to know it is ready.
  const all = ((requests ?? []) as unknown as (Omit<DsrRow, 'export_ready'> & {
    export_payload: unknown;
  })[]).map(({ export_payload, ...rest }) => ({
    ...rest,
    export_ready: export_payload !== null,
  })) as DsrRow[];

  const open = all.filter((r) => OPEN.includes(r.status));
  const closed = all.filter((r) => !OPEN.includes(r.status)).reverse();
  const canManage = can(staff, 'compliance.manage');

  const overdue = open.filter((r) => r.due_by && daysUntil(r.due_by) < 0);
  const undated = open.filter((r) => !r.due_by);

  return (
    <Shell staff={staff}>
      <header className="mb-6">
        <h1 className="text-xl font-bold">Data requests</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          Access, erasure and correction requests under the DPDP Act. Every one is a statutory right with a clock on
          it, and every erasure needs two different people — one to verify identity and approve, another to execute.
        </p>
      </header>

      {overdue.length > 0 ? (
        <div className="mb-6 rounded-lg border border-[--color-danger] bg-[--color-danger-tint] p-4 text-sm text-[--color-danger]">
          <p className="font-bold">
            {overdue.length} request{overdue.length === 1 ? '' : 's'} past the due date
          </p>
          <p className="mt-1">
            A missed deadline on a data-subject right is a reportable compliance failure, not a backlog item.
          </p>
        </div>
      ) : null}

      {undated.length > 0 ? (
        <div className="mb-6 rounded-lg border border-[--color-warn] bg-[--color-warn-tint] p-4 text-sm text-[--color-warn]">
          <p className="font-bold">
            {undated.length} open request{undated.length === 1 ? '' : 's'} with no due date
          </p>
          <p className="mt-1">
            The statutory response period is deliberately not hardcoded anywhere in this system — it has to be set
            from the reviewed policy rather than guessed at in a migration. Set a date on each so the clock is
            visible.
          </p>
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Open requests" value={String(open.length)} />
        <Stat label="Erasures completed" value={String((erasures ?? []).length)} />
        <Stat
          label="Soonest due"
          value={
            open.filter((r) => r.due_by).length === 0
              ? '—'
              : `${Math.min(...open.filter((r) => r.due_by).map((r) => daysUntil(r.due_by!)))}d`
          }
        />
      </div>

      {open.length === 0 ? (
        <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-6 text-sm text-[--color-ink-muted]">
          Nothing open. Requests appear here the moment somebody raises one in either app, or when ops records one
          taken over the phone.
        </p>
      ) : (
        <div className="space-y-3">
          {open.map((r) => (
            <RequestCard key={r.id} request={r} canManage={canManage} staffUserId={staff.userId} />
          ))}
        </div>
      )}

      {closed.length > 0 ? (
        <>
          <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
            Closed
          </h2>
          <div className="divide-y divide-[--color-line] rounded-lg border border-[--color-line] bg-[--color-surface]">
            {closed.map((r) => (
              <div key={r.id} className="px-4 py-3 text-sm">
                <span className="font-medium capitalize">{r.request_type}</span>
                <span className="text-[--color-ink-muted]">
                  {' '}
                  — {r.subject?.full_name ?? 'name erased'} · {r.status}
                  {r.completed_at ? ` on ${new Date(r.completed_at).toLocaleDateString('en-IN')}` : ''}
                </span>
                {r.resolution_note ? (
                  <p className="mt-0.5 text-xs text-[--color-ink-muted]">{r.resolution_note}</p>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}

      {(erasures ?? []).length > 0 ? (
        <>
          <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
            Erasure record
          </h2>
          <p className="mb-3 text-sm text-[--color-ink-muted]">
            This table survives the deletion and is not editable by anyone, including compliance. It is the evidence
            that an erasure was performed properly.
          </p>
          <div className="divide-y divide-[--color-line] rounded-lg border border-[--color-line] bg-[--color-surface]">
            {(erasures ?? []).map((e) => (
              <div key={e.id} className="px-4 py-3 text-sm">
                <span className="font-mono text-xs text-[--color-ink-muted]">{e.subject_id}</span>
                <span className="text-[--color-ink-muted]">
                  {' '}
                  — {new Date(e.executed_at).toLocaleString('en-IN')}
                </span>
                <p className="mt-0.5 text-xs text-[--color-ink-muted]">
                  {Object.entries((e.rows_removed ?? {}) as Record<string, number>)
                    .filter(([, n]) => Number(n) > 0)
                    .map(([table, n]) => `${table}: ${n}`)
                    .join(' · ') || 'no rows to remove'}
                </p>
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
