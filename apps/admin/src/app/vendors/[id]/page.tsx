import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '../../../lib/auth';
import { createClient } from '../../../lib/supabase/server';
import { Shell } from '../../../components/Shell';
import { can } from '../../../lib/permissions';
import { DOC_LABEL, REVIEW_STYLE, STATUS_LABEL, STATUS_STYLE, daysUntil } from '../labels';
import { DocumentRow, PayoutPanel, RateCardForm, StatusControl } from './PartnerControls';

export const dynamic = 'force-dynamic';

type Doc = {
  id: string;
  document_type: string;
  document_number: string | null;
  issued_on: string | null;
  expires_on: string | null;
  review_status: string;
  review_note: string | null;
  reviewed_at: string | null;
  uploaded_at: string;
};

export default async function PartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requirePermission('vendor.read');
  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select(
      `id, name, type, onboarding_status, is_verified, suspended_at, suspended_reason,
       contact_email, contact_phone, default_commission_rate, created_at`
    )
    .eq('id', id)
    .maybeSingle();

  // RLS decides this, not a permission check in TypeScript: a vendor_admin
  // querying another org's id gets no row and lands here, which is the same
  // answer as a genuinely missing partner. That is the intent — a 403 would
  // confirm the org exists.
  if (!org) notFound();

  const [
    { data: docs },
    { data: requirements },
    { data: rates },
    { data: runs },
    { data: categories },
    { data: ledger },
    { data: catalogue },
  ] = await Promise.all([
    supabase
      .from('partner_documents')
      .select(
        `id, document_type, document_number, issued_on, expires_on,
         review_status, review_note, reviewed_at, uploaded_at`
      )
      .eq('organization_id', id)
      .order('uploaded_at', { ascending: false }),
    supabase
      .from('partner_document_requirements')
      .select('document_type, is_mandatory')
      .eq('org_type', org.type),
    supabase
      .from('commission_rate_cards')
      .select('id, rate_percent, effective_from, effective_to, product_category_id')
      .eq('organization_id', id)
      .order('effective_from', { ascending: false }),
    supabase
      .from('payout_runs')
      .select(
        `id, period_start, period_end, gross_amount, commission_amount, payable_amount,
         status, created_by, approved_at, reference`
      )
      .eq('organization_id', id)
      .order('period_end', { ascending: false })
      .limit(24),
    supabase.from('product_categories').select('id, name').order('name'),
    supabase
      .from('commission_ledger')
      .select('gross_amount, commission_amount')
      .eq('partner_org_id', id)
      .is('payout_run_id', null),
    supabase.from('products').select('id, is_active, requires_prescription').eq('vendor_org_id', id),
  ]);

  const documents = (docs ?? []) as Doc[];
  const canManage = can(staff, 'vendor.manage') && !staff.organizationId;
  const canFinance = can(staff, 'finance.manage');

  // The checklist is the requirements table joined against what has arrived —
  // not a hardcoded list here, so adding a partner type is a data change.
  // "Mandatory and not verified" is exactly what set_partner_status() blocks
  // approval on, so the two cannot drift apart.
  const checklist = (requirements ?? []).map((req) => {
    const held = documents.find(
      (d) => d.document_type === req.document_type && d.review_status === 'verified'
    );
    const lapsed = held?.expires_on ? daysUntil(held.expires_on) < 0 : false;
    return { ...req, satisfied: Boolean(held) && !lapsed, lapsed };
  });
  const blocking = checklist.filter((c) => c.is_mandatory && !c.satisfied);

  const unpaidPayable = (ledger ?? []).reduce(
    (sum, row) => sum + (Number(row.gross_amount) - Number(row.commission_amount)),
    0
  );
  const listed = (catalogue ?? []).filter((p) => p.is_active && !p.requires_prescription).length;
  const withheld = (catalogue ?? []).length - listed;

  return (
    <Shell staff={staff}>
      <Link href="/vendors" className="text-sm text-[--color-brand] underline">
        &larr; All partners
      </Link>

      <header className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{org.name}</h1>
          <p className="mt-1 text-sm text-[--color-ink-muted]">
            {org.type.replace(/_/g, ' ')} &middot; joined{' '}
            {new Date(org.created_at).toLocaleDateString('en-IN')}
            {org.contact_email ? ` · ${org.contact_email}` : ''}
            {org.contact_phone ? ` · ${org.contact_phone}` : ''}
          </p>
        </div>
        <span
          className={`rounded px-2.5 py-1 text-xs font-bold uppercase ${STATUS_STYLE[org.onboarding_status] ?? ''}`}
        >
          {STATUS_LABEL[org.onboarding_status] ?? org.onboarding_status}
        </span>
      </header>

      {org.onboarding_status === 'suspended' ? (
        <div className="mb-6 rounded-lg border border-[--color-danger] bg-[--color-danger-tint] p-4 text-sm text-[--color-danger]">
          <p className="font-bold">
            Suspended {org.suspended_at ? new Date(org.suspended_at).toLocaleDateString('en-IN') : ''}
          </p>
          {org.suspended_reason ? <p className="mt-1">{org.suspended_reason}</p> : null}
          <p className="mt-1">
            Their listings are hidden from both apps, and products already in a senior&rsquo;s basket cannot be
            ordered.
          </p>
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Listings visible to seniors"
          value={String(listed)}
          note={withheld > 0 ? `${withheld} withheld (inactive or prescription-only)` : undefined}
          href={`/vendors/${org.id}/catalogue`}
        />
        <Stat label="Default commission" value={`${Number(org.default_commission_rate)}%`} />
        <Stat
          label="Commission not yet in a run"
          value={`₹${unpaidPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
        />
      </div>

      <Section title="Compliance documents">
        {blocking.length > 0 ? (
          <p className="mb-4 rounded-md border border-[--color-warn] bg-[--color-warn-tint] px-3 py-2 text-sm text-[--color-warn]">
            {blocking.length} mandatory document{blocking.length === 1 ? '' : 's'} outstanding:{' '}
            {blocking.map((b) => DOC_LABEL[b.document_type] ?? b.document_type).join(', ')}. Approval is blocked in
            the database until each is verified and in date — this banner is a courtesy, not the control.
          </p>
        ) : (
          <p className="mb-4 rounded-md border border-[--color-ok] bg-[--color-ok-tint] px-3 py-2 text-sm text-[--color-ok]">
            Every mandatory document for a {org.type.replace(/_/g, ' ')} is verified and in date.
          </p>
        )}

        <ul className="mb-5 grid gap-1.5 sm:grid-cols-2">
          {checklist.map((c) => (
            <li key={c.document_type} className="flex items-baseline gap-2 text-sm">
              <span className={c.satisfied ? 'text-[--color-ok]' : 'text-[--color-ink-muted]'}>
                {c.satisfied ? '✓' : '○'}
              </span>
              <span>
                {DOC_LABEL[c.document_type] ?? c.document_type}
                {c.is_mandatory ? null : <span className="text-[--color-ink-muted]"> (optional)</span>}
                {c.lapsed ? <span className="font-semibold text-[--color-danger]"> — expired</span> : null}
              </span>
            </li>
          ))}
        </ul>

        {documents.length === 0 ? (
          <p className="text-sm text-[--color-ink-muted]">Nothing uploaded yet.</p>
        ) : (
          <div className="divide-y divide-[--color-line] rounded-md border border-[--color-line]">
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                orgId={org.id}
                doc={doc}
                label={DOC_LABEL[doc.document_type] ?? doc.document_type}
                badgeClass={REVIEW_STYLE[doc.review_status] ?? ''}
                daysLeft={doc.expires_on ? daysUntil(doc.expires_on) : null}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Status">
        {canManage ? (
          <StatusControl orgId={org.id} current={org.onboarding_status} blocking={blocking.length} />
        ) : (
          <p className="text-sm text-[--color-ink-muted]">
            {staff.organizationId
              ? 'A partner cannot change its own status — that is enforced in the database, not just hidden here. Contact your Sukyoo account manager.'
              : 'Changing a partner’s status needs the vendor.manage permission.'}
          </p>
        )}
      </Section>

      <Section title="Commission rate cards">
        <p className="mb-3 text-sm text-[--color-ink-muted]">
          Rates are versioned by start date, never edited. Every transaction snapshots the rate in force at the time,
          so a change here cannot alter what this partner is already owed.
        </p>
        {(rates ?? []).length === 0 ? (
          <p className="mb-4 text-sm text-[--color-ink-muted]">
            No specific card — the organisation default of {Number(org.default_commission_rate)}% applies.
          </p>
        ) : (
          <table className="mb-4 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-[--color-ink-muted]">
              <tr>
                <th className="py-2">Rate</th>
                <th className="py-2">Category</th>
                <th className="py-2">From</th>
                <th className="py-2">Until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-line]">
              {(rates ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="py-2 font-medium tabular-nums">{Number(r.rate_percent)}%</td>
                  <td className="py-2 text-[--color-ink-muted]">
                    {(categories ?? []).find((c) => c.id === r.product_category_id)?.name ?? 'All categories'}
                  </td>
                  <td className="py-2 tabular-nums">{r.effective_from}</td>
                  <td className="py-2 tabular-nums text-[--color-ink-muted]">{r.effective_to ?? 'open'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {canFinance ? <RateCardForm orgId={org.id} categories={categories ?? []} /> : null}
      </Section>

      <Section title="Payouts">
        <PayoutPanel
          orgId={org.id}
          runs={runs ?? []}
          staffUserId={staff.userId}
          canFinance={canFinance}
          unpaidPayable={unpaidPayable}
        />
      </Section>
    </Shell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">{title}</h2>
      <div className="rounded-lg border border-[--color-line] bg-[--color-surface] p-5">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
}) {
  return (
    <div className="rounded-lg border border-[--color-line] bg-[--color-surface] p-5">
      <p className="text-sm text-[--color-ink-muted]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {note ? <p className="mt-1 text-xs text-[--color-ink-muted]">{note}</p> : null}
      {href ? (
        <Link href={href} className="mt-1 inline-block text-xs text-[--color-brand] underline">
          Manage catalogue
        </Link>
      ) : null}
    </div>
  );
}
