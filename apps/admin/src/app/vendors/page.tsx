import Link from 'next/link';
import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';
import { Shell } from '../../components/Shell';
import { DOC_LABEL, STATUS_STYLE, STATUS_LABEL, daysUntil } from './labels';

export const dynamic = 'force-dynamic';

type OrgRow = {
  id: string;
  name: string;
  type: string;
  onboarding_status: string;
  is_verified: boolean;
  suspended_reason: string | null;
  contact_email: string | null;
  created_at: string;
  partner_documents: { document_type: string; review_status: string; expires_on: string | null }[];
};

// Pipeline order, not alphabetical — this is a queue, so the things needing a
// decision come first and the settled ones sink.
const PIPELINE = ['under_review', 'documents_due', 'applied', 'approved', 'suspended', 'rejected'];

export default async function VendorsPage() {
  const staff = await requirePermission('vendor.read');
  const supabase = await createClient();

  const { data } = await supabase
    .from('organizations')
    .select(
      `id, name, type, onboarding_status, is_verified, suspended_reason, contact_email, created_at,
       partner_documents(document_type, review_status, expires_on)`
    )
    .order('created_at', { ascending: false })
    .limit(300);

  const orgs = (data ?? []) as unknown as OrgRow[];
  orgs.sort((a, b) => PIPELINE.indexOf(a.onboarding_status) - PIPELINE.indexOf(b.onboarding_status));

  // The expiry sweep. A live pharmacy with a lapsed drug licence is a
  // regulatory problem that announces itself on no particular day, so it has to
  // be surfaced rather than waited for.
  const expiring = orgs
    .flatMap((org) =>
      org.partner_documents
        .filter((d) => d.review_status === 'verified' && d.expires_on)
        .map((d) => ({ org, doc: d, days: daysUntil(d.expires_on!) }))
    )
    .filter((row) => row.days <= 45)
    .sort((a, b) => a.days - b.days);

  const lapsedOnLive = expiring.filter((r) => r.days < 0 && r.org.onboarding_status === 'approved');
  const awaitingDecision = orgs.filter((o) =>
    ['applied', 'documents_due', 'under_review'].includes(o.onboarding_status)
  );

  return (
    <Shell staff={staff}>
      <header className="mb-6">
        <h1 className="text-xl font-bold">Partners</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          Pharmacies, labs, clinics, insurers and home-care providers. Approving a partner is the moment their
          listings become visible to seniors; suspending one removes them from both apps immediately.
        </p>
      </header>

      {lapsedOnLive.length > 0 ? (
        <div className="mb-6 rounded-lg border border-[--color-danger] bg-[--color-danger-tint] p-4">
          <p className="text-sm font-bold text-[--color-danger]">
            {lapsedOnLive.length} live partner{lapsedOnLive.length === 1 ? '' : 's'} {' '}
            {lapsedOnLive.length === 1 ? 'has' : 'have'} an expired document
          </p>
          <p className="mt-1 text-sm text-[--color-danger]">
            These partners are currently selling to seniors on paperwork that has lapsed. Either get the renewal or
            suspend them — leaving it is the position with the most liability.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[--color-danger]">
            {lapsedOnLive.map(({ org, doc, days }) => (
              <li key={`${org.id}-${doc.document_type}`}>
                <Link href={`/vendors/${org.id}`} className="font-semibold underline">
                  {org.name}
                </Link>{' '}
                — {DOC_LABEL[doc.document_type] ?? doc.document_type} expired {Math.abs(days)} day
                {Math.abs(days) === 1 ? '' : 's'} ago
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Live partners" value={String(orgs.filter((o) => o.onboarding_status === 'approved').length)} />
        <Stat label="Awaiting a decision" value={String(awaitingDecision.length)} />
        <Stat label="Documents expiring in 45 days" value={String(expiring.filter((r) => r.days >= 0).length)} />
      </div>

      {expiring.some((r) => r.days >= 0) ? (
        <details className="mb-8 rounded-lg border border-[--color-warn] bg-[--color-warn-tint] p-4">
          <summary className="cursor-pointer text-sm font-bold text-[--color-warn]">
            Renewals due soon
          </summary>
          <ul className="mt-2 space-y-1 text-sm text-[--color-warn]">
            {expiring
              .filter((r) => r.days >= 0)
              .map(({ org, doc, days }) => (
                <li key={`${org.id}-${doc.document_type}`}>
                  <Link href={`/vendors/${org.id}`} className="font-semibold underline">
                    {org.name}
                  </Link>{' '}
                  — {DOC_LABEL[doc.document_type] ?? doc.document_type} in {days} day{days === 1 ? '' : 's'}
                </li>
              ))}
          </ul>
        </details>
      ) : null}

      {orgs.length === 0 ? (
        <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-6 text-sm text-[--color-ink-muted]">
          No partners yet. Organisations are created by ops, not self-registered.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[--color-line] bg-[--color-surface]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-line] text-left text-xs uppercase tracking-wide text-[--color-ink-muted]">
              <tr>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-line]">
              {orgs.map((org) => {
                const verified = org.partner_documents.filter((d) => d.review_status === 'verified').length;
                const pending = org.partner_documents.filter((d) => d.review_status === 'pending').length;
                return (
                  <tr key={org.id}>
                    <td className="px-4 py-3">
                      <Link href={`/vendors/${org.id}`} className="font-medium text-[--color-brand] underline">
                        {org.name}
                      </Link>
                      {org.contact_email ? (
                        <span className="block text-xs text-[--color-ink-muted]">{org.contact_email}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[--color-ink-muted]">{org.type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${STATUS_STYLE[org.onboarding_status] ?? ''}`}
                      >
                        {STATUS_LABEL[org.onboarding_status] ?? org.onboarding_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[--color-ink-muted]">
                      {org.partner_documents.length === 0 ? (
                        'None uploaded'
                      ) : (
                        <>
                          {verified} verified
                          {pending > 0 ? (
                            <span className="font-semibold text-[--color-warn]">, {pending} to review</span>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[--color-ink-muted]">
                      {new Date(org.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
