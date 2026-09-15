// Mirrors the staff_permission / staff_role enums in
// supabase/migrations/20260818100000_staff_rbac.sql.
//
// These types exist so the UI can decide what to RENDER. They are not the
// control — every one of them is also enforced by an RLS policy calling
// staff_has_permission(). If this file and the database ever disagree, the
// database wins and the user sees an empty list rather than data they shouldn't
// have. That asymmetry is deliberate.

export const PERMISSIONS = [
  'sos.read',
  'sos.manage',
  'user.read',
  'user.read_health',
  'user.manage',
  'content.read',
  'content.manage',
  'vendor.read',
  'vendor.manage',
  'finance.read',
  'finance.manage',
  'support.read',
  'support.manage',
  'compliance.read',
  'compliance.manage',
  'audit.read',
  'flags.manage',
  'campaign.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const STAFF_ROLES = [
  'super_admin',
  'ops_agent',
  'care_team',
  'content_manager',
  'vendor_manager',
  'finance',
  'support',
  'compliance_officer',
  'auditor',
  'vendor_admin',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

/** Typed reasons for a staff read of health data — matches the audit_reason enum. */
export const AUDIT_REASONS = [
  'sos_response',
  'support_request',
  'compliance_review',
  'payment_dispute',
  'data_subject_request',
  'quality_audit',
] as const;

export type AuditReason = (typeof AUDIT_REASONS)[number];

export const AUDIT_REASON_LABEL: Record<AuditReason, string> = {
  sos_response: 'Responding to an SOS event',
  support_request: 'Acting on a support request from this person',
  compliance_review: 'Compliance or regulatory review',
  payment_dispute: 'Investigating a payment dispute',
  data_subject_request: 'Fulfilling a data access or erasure request',
  quality_audit: 'Scheduled quality audit',
};

export type StaffContext = {
  userId: string;
  email: string | null;
  roles: StaffRole[];
  permissions: Set<Permission>;
  /** Non-null only for vendor_admin — the single org they may see. */
  organizationId: string | null;
};

export function can(staff: StaffContext, permission: Permission) {
  return staff.permissions.has(permission);
}
