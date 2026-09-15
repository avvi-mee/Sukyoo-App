'use server';

import { requirePermission } from '../../../lib/auth';
import { readSeniorHealth, type HealthResource } from '../../../lib/audit';
import { AUDIT_REASONS, type AuditReason } from '../../../lib/permissions';

const RESOURCES: HealthResource[] = ['vitals', 'medication', 'health_record', 'insurance_claim'];

export async function fetchHealth(args: {
  ownerId: string;
  resource: string;
  reason: string;
  reasonNote: string;
}) {
  await requirePermission('user.read_health');

  // Validate the enums here rather than trusting the client — these values go
  // into an audit row that has to stand up later.
  if (!RESOURCES.includes(args.resource as HealthResource)) {
    return { error: 'Unknown record type.' };
  }
  if (!AUDIT_REASONS.includes(args.reason as AuditReason)) {
    return { error: 'Choose a reason for this access.' };
  }

  return readSeniorHealth({
    ownerId: args.ownerId,
    resource: args.resource as HealthResource,
    reason: args.reason as AuditReason,
    reasonNote: args.reasonNote,
  });
}
