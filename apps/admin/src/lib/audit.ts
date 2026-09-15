import { createClient } from './supabase/server';
import type { AuditReason } from './permissions';

/**
 * The ONLY way this console reads a senior's health data.
 *
 * It is a thin wrapper by design. The actual permission check, the reason
 * validation and the audit_log write all happen inside the
 * `staff_read_senior_health` SQL function, in the same transaction as the read.
 * That matters because it means the guarantee does not depend on this file:
 * there is no staff SELECT policy on vitals_readings, medications,
 * health_records or insurance_claims, so even a developer who bypassed this
 * wrapper and queried the tables directly would get nothing back.
 *
 * In other words the audit trail cannot be forgotten, only deleted — and
 * deleting it needs database credentials, not a code change.
 */
export type HealthResource = 'vitals' | 'medication' | 'health_record' | 'insurance_claim';

export async function readSeniorHealth(args: {
  ownerId: string;
  resource: HealthResource;
  reason: AuditReason;
  reasonNote: string;
}): Promise<{ data: unknown[] } | { error: string }> {
  // Fail before the round trip so the user gets a useful message rather than a
  // Postgres exception. The database enforces the same rule regardless.
  if (args.reasonNote.trim().length < 10) {
    return { error: 'Please describe why you need to see this, in at least 10 characters.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('staff_read_senior_health', {
    p_owner_id: args.ownerId,
    p_resource_type: args.resource,
    p_reason: args.reason,
    p_reason_note: args.reasonNote.trim(),
  });

  if (error) {
    // 'not authorized' is the function's own raise; anything else is unexpected.
    return { error: error.message === 'not authorized' ? 'You do not have permission to view health data.' : 'Could not load this record.' };
  }
  return { data: (data as unknown[]) ?? [] };
}

/**
 * Records a staff action that isn't a health read — a suspension, a dispatch, a
 * verification. Health reads go through readSeniorHealth so the log and the read
 * share a transaction.
 */
export async function recordStaffAction(args: {
  resourceType: string;
  resourceId?: string;
  ownerId?: string;
  reason: AuditReason;
  reasonNote: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Goes through an RPC, not a direct insert: audit_log has no INSERT policy by
  // design, and the RPC takes actor_id from auth.uid() so one staff member
  // cannot attribute an action to a colleague.
  const { error } = await supabase.rpc('log_staff_action', {
    p_resource_type: args.resourceType,
    p_reason: args.reason,
    p_reason_note: args.reasonNote.trim(),
    p_resource_id: args.resourceId ?? null,
    p_owner_id: args.ownerId ?? null,
  });

  return error ? { error: 'Could not record this action.' } : {};
}
