import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';
import { Shell } from '../../components/Shell';
import { can } from '../../lib/permissions';
import { RevokeLinkButton } from './RevokeLinkButton';

export const dynamic = 'force-dynamic';

const RESOURCE_LABEL: Record<string, string> = {
  vitals: 'Readings',
  medication: 'Medicines',
  health_record: 'Reports',
  insurance_policy: 'Policy',
  insurance_claim: 'Claims',
  life_story_entry: 'Stories',
  order: 'Ordering',
};

type LinkRow = {
  id: string;
  status: string;
  relationship_type: string | null;
  created_at: string;
  senior: { id: string; full_name: string | null } | null;
  family_member: { id: string; full_name: string | null } | null;
  permission_grants: { resource_type: string; access_level: string; revoked_at: string | null }[];
};

export default async function PairingsPage() {
  const staff = await requirePermission('compliance.read');
  const supabase = await createClient();

  const { data } = await supabase
    .from('family_links')
    .select(
      `id, status, relationship_type, created_at,
       senior:profiles!family_links_senior_id_fkey(id, full_name),
       family_member:profiles!family_links_family_member_id_fkey(id, full_name),
       permission_grants(resource_type, access_level, revoked_at)`
    )
    .order('created_at', { ascending: false })
    .limit(200);

  const links = (data ?? []) as unknown as LinkRow[];
  const canManage = can(staff, 'compliance.manage');

  return (
    <Shell staff={staff}>
      <header className="mb-6">
        <h1 className="text-xl font-bold">Pairings &amp; consent</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          Who is linked to whom, and exactly what each family member has been granted. Consent is the senior&rsquo;s to
          give — this view exists to answer questions and to unpick mistakes, not to grant access on their behalf.
        </p>
      </header>

      {links.length === 0 ? (
        <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-6 text-sm text-[--color-ink-muted]">
          No pairings yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[--color-line] bg-[--color-surface]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-line] text-left text-xs uppercase tracking-wide text-[--color-ink-muted]">
              <tr>
                <th className="px-4 py-3">Senior</th>
                <th className="px-4 py-3">Family member</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Shared</th>
                <th className="px-4 py-3">Linked</th>
                {canManage ? <th className="px-4 py-3">Action</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-line]">
              {links.map((link) => {
                const live = link.permission_grants.filter((g) => !g.revoked_at);
                return (
                  <tr key={link.id}>
                    <td className="px-4 py-3 font-medium">{link.senior?.full_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {link.family_member?.full_name ?? '—'}
                      {link.relationship_type ? (
                        <span className="text-[--color-ink-muted]"> ({link.relationship_type})</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                          link.status === 'active'
                            ? 'bg-[--color-ok-tint] text-[--color-ok]'
                            : 'bg-[--color-canvas] text-[--color-ink-muted]'
                        }`}
                      >
                        {link.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {live.length === 0 ? (
                        // A link with no grants is the designed default, not a
                        // misconfiguration — worth saying so plainly here.
                        <span className="text-[--color-ink-muted]">Nothing shared</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {live.map((g) => (
                            <span
                              key={g.resource_type}
                              className="rounded bg-[--color-brand-tint] px-1.5 py-0.5 text-xs font-medium text-[--color-brand]"
                            >
                              {RESOURCE_LABEL[g.resource_type] ?? g.resource_type}
                              {g.access_level === 'manage' ? ' ✎' : ''}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[--color-ink-muted]">
                      {new Date(link.created_at).toLocaleDateString('en-IN')}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        {link.status === 'active' ? <RevokeLinkButton linkId={link.id} /> : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-[--color-ink-muted]">
        ✎ marks a &ldquo;manage&rdquo; grant, which allows spending on the senior&rsquo;s behalf. Revoking a pairing
        withdraws every grant under it in the same transaction.
      </p>
    </Shell>
  );
}
