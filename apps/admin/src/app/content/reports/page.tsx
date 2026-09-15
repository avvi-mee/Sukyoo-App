import Link from 'next/link';
import { requirePermission } from '../../../lib/auth';
import { createClient } from '../../../lib/supabase/server';
import { Shell } from '../../../components/Shell';
import { can } from '../../../lib/permissions';
import { ResolveReport } from './ResolveReport';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<string, string> = {
  distressing: 'Distressing',
  inappropriate: 'Inappropriate',
  inaccurate: 'Inaccurate',
  not_working: 'Not working',
  other: 'Other',
};

// Safeguarding first. A senior reporting something distressing is a different
// kind of problem from a broken audio track, and a queue sorted only by time
// buries it.
const URGENCY = ['distressing', 'inappropriate', 'inaccurate', 'not_working', 'other'];

type Report = {
  id: string;
  resource_type: string;
  resource_id: string;
  category: string;
  detail: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  resolution_note: string | null;
  reporter: { full_name: string | null } | null;
  reviewer: { full_name: string | null } | null;
};

export default async function ReportsPage() {
  const staff = await requirePermission('content.read');
  const supabase = await createClient();

  const { data } = await supabase
    .from('content_reports')
    .select(
      `id, resource_type, resource_id, category, detail, status, created_at,
       reviewed_at, resolution_note,
       reporter:profiles!content_reports_reported_by_fkey(full_name),
       reviewer:profiles!content_reports_reviewed_by_fkey(full_name)`
    )
    .order('created_at', { ascending: false })
    .limit(200);

  const reports = (data ?? []) as unknown as Report[];
  const open = reports
    .filter((r) => r.status === 'open')
    .sort((a, b) => URGENCY.indexOf(a.category) - URGENCY.indexOf(b.category));
  const closed = reports.filter((r) => r.status !== 'open');
  const canManage = can(staff, 'content.manage');

  return (
    <Shell staff={staff}>
      <Link href="/content" className="text-sm text-[--color-brand] underline">
        &larr; Content library
      </Link>

      <header className="mb-6 mt-3">
        <h1 className="text-xl font-bold">Reports</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          What seniors and family members have flagged, across broadcasts, titles, events and shared stories.
          Distressing and inappropriate reports sort to the top regardless of when they arrived.
        </p>
      </header>

      {open.length === 0 ? (
        <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-6 text-sm text-[--color-ink-muted]">
          Nothing open.{' '}
          {reports.length === 0
            ? 'Nothing has ever been reported — there is very little user-generated content on the platform yet.'
            : `${closed.length} resolved report${closed.length === 1 ? '' : 's'} below.`}
        </p>
      ) : (
        <div className="divide-y divide-[--color-line] rounded-lg border border-[--color-line] bg-[--color-surface]">
          {open.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                      ['distressing', 'inappropriate'].includes(r.category)
                        ? 'bg-[--color-danger-tint] text-[--color-danger]'
                        : 'bg-[--color-warn-tint] text-[--color-warn]'
                    }`}
                  >
                    {CATEGORY_LABEL[r.category] ?? r.category}
                  </span>
                  <span className="ml-2 font-medium">{r.resource_type.replace(/_/g, ' ')}</span>
                  <span className="ml-2 font-mono text-xs text-[--color-ink-muted]">{r.resource_id}</span>
                </div>
                <span className="text-xs text-[--color-ink-muted]">
                  {r.reporter?.full_name ?? 'unknown'} ·{' '}
                  {new Date(r.created_at).toLocaleString('en-IN')}
                </span>
              </div>

              {r.detail ? <p className="mt-2 text-sm">{r.detail}</p> : null}

              {canManage ? <ResolveReport reportId={r.id} /> : null}
            </div>
          ))}
        </div>
      )}

      {closed.length > 0 ? (
        <>
          <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
            Resolved
          </h2>
          <div className="divide-y divide-[--color-line] rounded-lg border border-[--color-line] bg-[--color-surface]">
            {closed.map((r) => (
              <div key={r.id} className="px-4 py-3 text-sm">
                <span className="font-medium">{CATEGORY_LABEL[r.category] ?? r.category}</span>
                <span className="text-[--color-ink-muted]"> on {r.resource_type.replace(/_/g, ' ')} — </span>
                <span className={r.status === 'actioned' ? 'text-[--color-ok]' : 'text-[--color-ink-muted]'}>
                  {r.status}
                </span>
                <span className="text-[--color-ink-muted]">
                  {' '}
                  by {r.reviewer?.full_name ?? 'unknown'}
                  {r.reviewed_at ? ` on ${new Date(r.reviewed_at).toLocaleDateString('en-IN')}` : ''}
                </span>
                {r.resolution_note ? (
                  <p className="mt-0.5 text-xs text-[--color-ink-muted]">{r.resolution_note}</p>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Shell>
  );
}
