import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '../../../../lib/auth';
import { createClient } from '../../../../lib/supabase/server';
import { Shell } from '../../../../components/Shell';
import { can } from '../../../../lib/permissions';
import { CatalogueImport } from './CatalogueImport';
import { COLUMNS } from './parse';

export const dynamic = 'force-dynamic';

export default async function CataloguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requirePermission('vendor.read');
  const supabase = await createClient();

  const [{ data: org }, { data: products }, { data: categories }] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, onboarding_status')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('products')
      .select('id, name, price, is_active, requires_prescription, category:product_categories(slug, name)')
      .eq('vendor_org_id', id)
      .order('name'),
    supabase.from('product_categories').select('slug, name').order('name'),
  ]);

  if (!org) notFound();

  const listings = (products ?? []) as unknown as {
    id: string;
    name: string;
    price: number;
    is_active: boolean;
    requires_prescription: boolean;
    category: { slug: string; name: string } | null;
  }[];

  const canManage = can(staff, 'vendor.manage');
  const live = org.onboarding_status === 'approved';
  const held = listings.filter((p) => p.requires_prescription);

  return (
    <Shell staff={staff}>
      <Link href={`/vendors/${id}`} className="text-sm text-[--color-brand] underline">
        &larr; {org.name}
      </Link>

      <header className="mb-6 mt-3">
        <h1 className="text-xl font-bold">Catalogue</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          {listings.length} listing{listings.length === 1 ? '' : 's'}.{' '}
          {live
            ? 'This partner is live, so changes here are visible to seniors immediately.'
            : 'This partner is not live, so nothing here is visible to seniors yet.'}
        </p>
      </header>

      {held.length > 0 ? (
        <div className="mb-6 rounded-lg border border-[--color-warn] bg-[--color-warn-tint] p-4 text-sm text-[--color-warn]">
          <p className="font-bold">
            {held.length} listing{held.length === 1 ? '' : 's'} marked prescription-only and withheld
          </p>
          <p className="mt-1">
            There is no prescription-upload flow yet, so these are hidden from the catalogue and refused at checkout
            — both enforced in the database, not here. They stay listed so the paperwork is ready when that flow
            exists: {held.map((p) => p.name).join(', ')}.
          </p>
        </div>
      ) : null}

      {canManage ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
            Import from CSV
          </h2>
          <div className="rounded-lg border border-[--color-line] bg-[--color-surface] p-5">
            <p className="mb-3 text-sm text-[--color-ink-muted]">
              Header row required: <code className="font-mono text-xs">{COLUMNS.join(',')}</code>. Rows are matched
              to existing listings by name, case-insensitively. Categories available:{' '}
              {(categories ?? []).map((c) => c.slug).join(', ')}.
            </p>
            <CatalogueImport orgId={id} />
          </div>
        </section>
      ) : null}

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
        Current listings
      </h2>
      {listings.length === 0 ? (
        <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-6 text-sm text-[--color-ink-muted]">
          Nothing listed yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[--color-line] bg-[--color-surface]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-line] text-left text-xs uppercase tracking-wide text-[--color-ink-muted]">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Visible to seniors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-line]">
              {listings.map((p) => {
                const visible = live && p.is_active && !p.requires_prescription;
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-[--color-ink-muted]">{p.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 tabular-nums">₹{Number(p.price).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      {visible ? (
                        <span className="text-[--color-ok]">Yes</span>
                      ) : (
                        <span className="text-[--color-ink-muted]">
                          No —{' '}
                          {!live
                            ? 'partner not live'
                            : p.requires_prescription
                              ? 'prescription-only'
                              : 'inactive'}
                        </span>
                      )}
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
