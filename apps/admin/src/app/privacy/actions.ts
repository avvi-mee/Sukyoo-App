'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';

type Result = { error?: string; notice?: string };

function friendly(message: string) {
  if (message.includes('not authorized') || message.includes('row-level security')) {
    return 'You do not have permission to do that.';
  }
  // Every other raise message here IS the rule. Paraphrasing them would drop the
  // reason, which is the only part that helps.
  return message;
}

export async function setDueBy(requestId: string, dueBy: string): Promise<Result> {
  await requirePermission('compliance.manage');
  if (!dueBy) return { error: 'Pick a date.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('data_subject_requests')
    .update({ due_by: dueBy })
    .eq('id', requestId);
  if (error) return { error: friendly(error.message) };

  revalidatePath('/privacy');
  return { notice: `Due date set to ${dueBy}.` };
}

export async function markVerifying(requestId: string): Promise<Result> {
  await requirePermission('compliance.manage');

  const supabase = await createClient();
  const { error } = await supabase
    .from('data_subject_requests')
    .update({ status: 'verifying' })
    .eq('id', requestId)
    .eq('status', 'received');
  if (error) return { error: friendly(error.message) };

  revalidatePath('/privacy');
  return { notice: 'Marked as being verified.' };
}

export async function rejectRequest(requestId: string, note: string): Promise<Result> {
  await requirePermission('compliance.manage');
  if (note.trim().length < 10) {
    return { error: 'Rejecting a statutory right needs a recorded reason of at least 10 characters.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('data_subject_requests')
    .update({ status: 'rejected', resolution_note: note.trim(), completed_at: new Date().toISOString() })
    .eq('id', requestId)
    .in('status', ['received', 'verifying', 'approved']);
  if (error) return { error: friendly(error.message) };

  revalidatePath('/privacy');
  return { notice: 'Rejected, with the reason recorded.' };
}

/**
 * Approves a request after identity verification.
 *
 * The note is not paperwork: identity verification is the ONLY thing standing
 * between a stolen session and the destruction of someone's health record. The
 * RPC refuses a note under 10 characters and refuses a self-approval.
 */
export async function approveRequest(requestId: string, note: string): Promise<Result> {
  await requirePermission('compliance.manage');
  if (note.trim().length < 10) {
    return { error: 'Record how the requester was identified, in at least 10 characters.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('approve_data_request', {
    p_request_id: requestId,
    p_note: note.trim(),
  });
  if (error) return { error: friendly(error.message) };

  revalidatePath('/privacy');
  return { notice: 'Approved. An erasure now needs a different person to execute it.' };
}

export async function generateExport(requestId: string): Promise<Result> {
  await requirePermission('compliance.manage');

  const supabase = await createClient();
  const { error } = await supabase.rpc('build_data_export', { p_request_id: requestId });
  if (error) return { error: friendly(error.message) };

  revalidatePath('/privacy');
  return {
    notice:
      'Export generated. The person can now collect it in the app — this console deliberately does not download it, so a copy of their whole record does not land on a staff laptop.',
  };
}

/**
 * Executes an approved erasure. Irreversible.
 *
 * Two guards live in the RPC, not here: it refuses if the caller approved the
 * request, and it refuses anything not already approved.
 */
export async function executeErasure(requestId: string, note: string): Promise<Result> {
  await requirePermission('compliance.manage');
  if (note.trim().length < 10) return { error: 'Record what was done, in at least 10 characters.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('execute_erasure_request', {
    p_request_id: requestId,
    p_note: note.trim(),
  });
  if (error) return { error: friendly(error.message) };

  const result = (data ?? {}) as { storage_files_still_to_delete?: boolean };
  revalidatePath('/privacy');
  return {
    notice: result.storage_files_still_to_delete
      ? 'Erasure executed. The health-records and life-stories FILES are not reachable from the database and must still be deleted from storage — this is not yet a complete erasure.'
      : 'Erasure executed.',
  };
}
