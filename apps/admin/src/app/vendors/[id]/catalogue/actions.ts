'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '../../../../lib/auth';
import { recordStaffAction } from '../../../../lib/audit';
import { createClient } from '../../../../lib/supabase/server';
import { parseCatalogueCsv, type ParsedRow } from './parse';

export type Change =
  | { kind: 'create'; row: ParsedRow }
  | { kind: 'update'; row: ParsedRow; before: Existing; fields: string[] }
  | { kind: 'unchanged'; row: ParsedRow }
  | { kind: 'delist'; before: Existing };

type Existing = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  is_active: boolean;
  requires_prescription: boolean;
  category_id: string | null;
};

export type Diff = {
  changes: Change[];
  errors: { line: number; message: string }[];
  counts: { create: number; update: number; unchanged: number; delist: number };
};

/**
 * Loads the org's current catalogue plus the category slug→id map.
 *
 * Read under the operator's own session, so a vendor_admin pointed at another
 * org's id sees an empty catalogue and every row reads as a create — which the
 * write below then refuses. RLS is doing the work, not this function.
 */
async function loadContext(orgId: string) {
  const supabase = await createClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from('product_categories').select('id, slug'),
    supabase
      .from('products')
      .select('id, name, price, description, is_active, requires_prescription, category_id')
      .eq('vendor_org_id', orgId),
  ]);

  const slugToId = new Map((categories ?? []).map((c) => [c.slug, c.id]));
  const byName = new Map(
    ((products ?? []) as Existing[]).map((p) => [p.name.trim().toLowerCase(), p])
  );
  return { supabase, slugToId, byName, existing: (products ?? []) as Existing[] };
}

function diffRow(row: ParsedRow, before: Existing, categoryId: string): Change {
  const fields: string[] = [];
  // Money compared in paise: 100 and 100.00 arrive as different strings from
  // PostgREST's numeric, and a false "changed" on every import makes the diff
  // useless as a review tool.
  if (Math.round(Number(before.price) * 100) !== Math.round(row.price * 100)) fields.push('price');
  if ((before.description ?? null) !== row.description) fields.push('description');
  if (before.is_active !== row.isActive) fields.push('is_active');
  if (before.requires_prescription !== row.requiresPrescription) fields.push('requires_prescription');
  if (before.category_id !== categoryId) fields.push('category');

  return fields.length === 0 ? { kind: 'unchanged', row } : { kind: 'update', row, before, fields };
}

export async function previewCatalogue(orgId: string, csv: string): Promise<Diff> {
  await requirePermission('vendor.manage');
  const { slugToId, byName, existing } = await loadContext(orgId);

  const { rows, errors } = parseCatalogueCsv(csv, new Set(slugToId.keys()));

  const changes: Change[] = rows.map((row) => {
    const before = byName.get(row.name.trim().toLowerCase());
    return before ? diffRow(row, before, slugToId.get(row.category)!) : { kind: 'create', row };
  });

  // Anything the partner currently lists that the file omits. Reported as a
  // DELIST rather than a delete: an order-history row points at the product, and
  // an upload that silently destroyed a listing with sales against it would be
  // the worst kind of "convenient".
  const inFile = new Set(rows.map((r) => r.name.trim().toLowerCase()));
  for (const p of existing) {
    if (!inFile.has(p.name.trim().toLowerCase()) && p.is_active) {
      changes.push({ kind: 'delist', before: p });
    }
  }

  return {
    changes,
    errors,
    counts: {
      create: changes.filter((c) => c.kind === 'create').length,
      update: changes.filter((c) => c.kind === 'update').length,
      unchanged: changes.filter((c) => c.kind === 'unchanged').length,
      delist: changes.filter((c) => c.kind === 'delist').length,
    },
  };
}

/**
 * Applies the import.
 *
 * Re-parses and re-diffs from the raw CSV rather than accepting the preview the
 * browser holds — the preview is a rendering, not an instruction. If the
 * catalogue changed between preview and apply, the operator gets the newer
 * result, which is the correct answer even though it may differ from what they
 * saw.
 *
 * Refuses outright if the file has any error. A partial catalogue import leaves
 * a partner half-migrated with no record of where it stopped.
 */
export async function applyCatalogue(
  orgId: string,
  csv: string,
  delistMissing: boolean
): Promise<{ error?: string; notice?: string }> {
  await requirePermission('vendor.manage');

  const diff = await previewCatalogue(orgId, csv);
  if (diff.errors.length > 0) {
    return { error: `Fix the ${diff.errors.length} problem(s) in the file first — nothing was written.` };
  }
  if (diff.counts.create + diff.counts.update === 0 && !(delistMissing && diff.counts.delist > 0)) {
    return { notice: 'Nothing to do — the catalogue already matches the file.' };
  }

  const { supabase, slugToId } = await loadContext(orgId);

  const upserts = diff.changes
    .filter((c): c is Extract<Change, { kind: 'create' | 'update' }> =>
      c.kind === 'create' || c.kind === 'update'
    )
    .map((c) => ({
      vendor_org_id: orgId,
      category_id: slugToId.get(c.row.category)!,
      name: c.row.name,
      description: c.row.description,
      price: c.row.price,
      is_active: c.row.isActive,
      requires_prescription: c.row.requiresPrescription,
    }));

  if (upserts.length > 0) {
    // Conflict target is the unique index from migration 0012,
    // (vendor_org_id, lower(btrim(name))). Without it this would insert
    // duplicates on every re-upload.
    const { error } = await supabase
      .from('products')
      .upsert(upserts, { onConflict: 'vendor_org_id,name' });
    if (error) {
      return {
        error: error.message.includes('row-level security')
          ? 'You do not have permission to change this partner’s catalogue.'
          : `Import failed: ${error.message}`,
      };
    }
  }

  let delisted = 0;
  if (delistMissing) {
    const ids = diff.changes.filter((c) => c.kind === 'delist').map((c) => c.before.id);
    if (ids.length > 0) {
      const { error } = await supabase.from('products').update({ is_active: false }).in('id', ids);
      if (error) return { error: `Delisting failed: ${error.message}` };
      delisted = ids.length;
    }
  }

  // A catalogue import changes prices seniors will pay. Not health data, so it
  // does not go through readSeniorHealth, but it is exactly the kind of bulk
  // change that needs a name against it afterwards.
  await recordStaffAction({
    resourceType: 'catalogue_import',
    resourceId: orgId,
    reason: 'quality_audit',
    reasonNote: `Imported ${diff.counts.create} new and ${diff.counts.update} changed listing(s); delisted ${delisted}.`,
  });

  revalidatePath(`/vendors/${orgId}/catalogue`);
  revalidatePath(`/vendors/${orgId}`);
  return {
    notice: `Added ${diff.counts.create}, updated ${diff.counts.update}${delisted ? `, delisted ${delisted}` : ''}.`,
  };
}
