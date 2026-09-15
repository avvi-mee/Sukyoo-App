'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';

/**
 * Every action here goes through an RPC rather than a table write, for the same
 * reason throughout this console: the RPCs hold the rules that must not be
 * re-implemented in TypeScript. set_partner_status() refuses to approve a
 * partner with missing paperwork and refuses to let a vendor_admin approve
 * itself; approve_payout_run() refuses the creator as approver. If those checks
 * lived here, a second caller would be a second place to get them wrong.
 *
 * The messages below are deliberately mapped from the Postgres exception text,
 * because that text IS the rule and paraphrasing it loses the reason.
 */
function friendly(message: string) {
  if (message.includes('not authorized')) return 'You do not have permission to do that.';
  if (message.includes('mandatory document')) return message.replace(/^.*?cannot approve/, 'Cannot approve');
  if (message.includes('approved by someone other')) {
    return 'A payout run must be approved by someone other than whoever built it.';
  }
  if (message.includes('reason note')) return 'Please give a reason of at least 10 characters.';
  if (message.includes('only a draft run')) return 'That run has already been approved.';
  return message;
}

type Result = { error?: string; notice?: string };

const STATUSES = [
  'applied',
  'documents_due',
  'under_review',
  'approved',
  'rejected',
  'suspended',
] as const;
export type PartnerStatus = (typeof STATUSES)[number];

export async function setPartnerStatus(orgId: string, status: string, note: string): Promise<Result> {
  await requirePermission('vendor.manage');
  if (!STATUSES.includes(status as PartnerStatus)) return { error: 'Unknown status.' };
  if (note.trim().length < 10) return { error: 'Record why, in at least 10 characters.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_partner_status', {
    p_org_id: orgId,
    p_status: status,
    p_reason_note: note.trim(),
  });
  if (error) return { error: friendly(error.message) };

  // Approval and suspension both change what seniors can see, so the mobile
  // apps' catalogue is invalidated by the RLS policy immediately — nothing to
  // purge here. Only this console caches.
  revalidatePath('/vendors');
  revalidatePath(`/vendors/${orgId}`);
  return {
    notice:
      status === 'approved'
        ? 'Approved. Their listings are visible to seniors from now.'
        : status === 'suspended'
          ? 'Suspended. Their listings are already gone from both apps.'
          : 'Status updated.',
  };
}

export async function reviewDocument(
  orgId: string,
  documentId: string,
  status: string,
  note: string
): Promise<Result> {
  await requirePermission('vendor.manage');
  if (!['pending', 'verified', 'rejected', 'expired'].includes(status)) {
    return { error: 'Unknown review status.' };
  }
  if (status === 'rejected' && note.trim().length < 10) {
    // Rejection is the one outcome the partner has to act on, so it cannot be a
    // bare status change with no explanation attached.
    return { error: 'Say what is wrong with the document, in at least 10 characters.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('review_partner_document', {
    p_document_id: documentId,
    p_status: status,
    p_note: note.trim() || null,
  });
  if (error) return { error: friendly(error.message) };

  revalidatePath(`/vendors/${orgId}`);
  return { notice: `Marked ${status}.` };
}

/**
 * Issues a short-lived signed URL for a compliance document.
 *
 * The bucket is private and there is no public path to it. Signing happens here,
 * under the operator's own session, so the RLS policy on partner_documents
 * decides whether they may see the row at all before a URL exists.
 */
export async function documentUrl(documentId: string): Promise<{ url?: string; error?: string }> {
  await requirePermission('vendor.read');
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from('partner_documents')
    .select('storage_path')
    .eq('id', documentId)
    .maybeSingle();
  if (!doc) return { error: 'That document is not available to you.' };

  const { data, error } = await supabase.storage
    .from('partner-documents')
    .createSignedUrl(doc.storage_path, 120);

  if (error || !data) {
    return { error: 'Could not open the file. It may not have finished uploading.' };
  }
  return { url: data.signedUrl };
}

export async function addRateCard(
  orgId: string,
  ratePercent: number,
  effectiveFrom: string,
  categoryId: string | null
): Promise<Result> {
  await requirePermission('finance.manage');
  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
    return { error: 'Rate must be between 0 and 100.' };
  }
  if (!effectiveFrom) return { error: 'Pick a date the new rate starts from.' };

  const supabase = await createClient();
  // Insert a new row rather than editing the live one. commission_ledger
  // snapshots the rate at transaction time, and a rate card is the historical
  // record those snapshots came from — editing it in place would rewrite what a
  // partner was owed for work already done.
  const { error } = await supabase.from('commission_rate_cards').insert({
    organization_id: orgId,
    product_category_id: categoryId,
    rate_percent: ratePercent,
    effective_from: effectiveFrom,
  });
  if (error) return { error: friendly(error.message) };

  revalidatePath(`/vendors/${orgId}`);
  return { notice: `New rate of ${ratePercent}% applies from ${effectiveFrom}.` };
}

export async function buildPayoutRun(
  orgId: string,
  periodStart: string,
  periodEnd: string
): Promise<Result> {
  await requirePermission('finance.manage');
  if (!periodStart || !periodEnd) return { error: 'Give both a start and an end date.' };
  if (periodEnd < periodStart) return { error: 'The end date cannot be before the start date.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('build_payout_run', {
    p_org_id: orgId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });
  if (error) return { error: friendly(error.message) };

  revalidatePath(`/vendors/${orgId}`);
  return { notice: 'Draft run built. It needs a second person to approve it.' };
}

export async function approvePayoutRun(
  orgId: string,
  runId: string,
  reference: string
): Promise<Result> {
  await requirePermission('finance.manage');

  const supabase = await createClient();
  const { error } = await supabase.rpc('approve_payout_run', {
    p_run_id: runId,
    p_reference: reference.trim() || null,
  });
  if (error) return { error: friendly(error.message) };

  revalidatePath(`/vendors/${orgId}`);
  return { notice: 'Approved for payment.' };
}
