import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';
import { Shell } from '../../components/Shell';

export const dynamic = 'force-dynamic';

type AuditRow = {
  id: string;
  action: string;
  resource_type: string;
  owner_id: string | null;
  accessed_at: string;
  reason: string | null;
  reason_note: string | null;
  actor_is_staff: boolean;
  actor: { full_name: string | null } | null;
};

export default async function AuditPage() {
  const staff = await requirePermission('audit.read');
  const supabase = await createClient();

  const { data } = await supabase
    .from('audit_log')
    .select(
      `id, action, resource_type, owner_id, accessed_at, reason, reason_note, actor_is_staff,
       actor:profiles!audit_log_actor_id_fkey(full_name)`
    )
    .order('accessed_at', { ascending: false })
    .limit(300);

  const rows = (data ?? []) as unknown as AuditRow[];
  const staffReads = rows.filter((r) => r.actor_is_staff);

  return (
    <Shell staff={staff}>
      <header className="mb-6">
        <h1 className="text-xl font-bold">Audit trail</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          Every access to a senior&rsquo;s sensitive records — by family members under a consent grant, and by staff with
          a recorded reason. This is the evidence base for a DPDP data-subject request or a breach assessment.
        </p>
      </header>

      <div className="mb-6 rounded-lg border border-[--color-line] bg-[--color-surface] p-4 text-sm">
        <p>
          <strong className="tabular-nums">{staffReads.length}</strong> of the last{' '}
          <strong className="tabular-nums">{rows.length}</strong> entries were staff access.
        </p>
        <p className="mt-1 text-xs text-[--color-ink-muted]">
          Note: this log is append-only by convention, not by constraint — anyone with database credentials can still
          rewrite it. That limitation is recorded in docs/SECURITY.md rather than papered over.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-6 text-sm text-[--color-ink-muted]">
          Nothing recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[--color-line] bg-[--color-surface]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-line] text-left text-xs uppercase tracking-wide text-[--color-ink-muted]">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Did</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-line]">
              {rows.map((row) => (
                <tr key={row.id} className={row.actor_is_staff ? 'bg-[--color-warn-tint]/40' : undefined}>
                  <td className="whitespace-nowrap px-4 py-3 text-[--color-ink-muted]">
                    {new Date(row.accessed_at).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{row.actor?.full_name ?? '—'}</span>
                    {row.actor_is_staff ? (
                      <span className="ml-1 rounded bg-[--color-warn-tint] px-1.5 py-0.5 text-xs font-bold uppercase text-[--color-warn]">
                        staff
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {row.action} · {row.resource_type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[--color-ink-muted]">
                    {row.owner_id ? `${row.owner_id.slice(0, 8)}…` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {row.reason ? (
                      <>
                        <span className="font-medium">{row.reason.replace(/_/g, ' ')}</span>
                        {row.reason_note ? (
                          <span className="block text-xs text-[--color-ink-muted]">{row.reason_note}</span>
                        ) : null}
                      </>
                    ) : (
                      // Family reads under a granted consent need no
                      // justification; only staff access does.
                      <span className="text-xs text-[--color-ink-muted]">Consent grant</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
