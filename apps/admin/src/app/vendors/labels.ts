// Shared between the list and the detail page, and importable from both server
// and client components — so no 'use server' / 'use client' directive here.

export const STATUS_LABEL: Record<string, string> = {
  applied: 'Applied',
  documents_due: 'Documents due',
  under_review: 'Under review',
  approved: 'Live',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export const STATUS_STYLE: Record<string, string> = {
  approved: 'bg-[--color-ok-tint] text-[--color-ok]',
  suspended: 'bg-[--color-danger-tint] text-[--color-danger]',
  rejected: 'bg-[--color-danger-tint] text-[--color-danger]',
  under_review: 'bg-[--color-warn-tint] text-[--color-warn]',
  documents_due: 'bg-[--color-warn-tint] text-[--color-warn]',
  applied: 'bg-[--color-canvas] text-[--color-ink-muted]',
};

export const DOC_LABEL: Record<string, string> = {
  gst_certificate: 'GST certificate',
  pan_card: 'PAN card',
  trade_licence: 'Trade licence',
  drug_licence: 'Drug licence',
  nabl_accreditation: 'NABL accreditation',
  medical_council_reg: 'Medical council registration',
  insurance_certificate: 'Insurance certificate',
  bank_proof: 'Bank proof',
  other: 'Other',
};

export const REVIEW_STYLE: Record<string, string> = {
  verified: 'bg-[--color-ok-tint] text-[--color-ok]',
  rejected: 'bg-[--color-danger-tint] text-[--color-danger]',
  expired: 'bg-[--color-danger-tint] text-[--color-danger]',
  pending: 'bg-[--color-warn-tint] text-[--color-warn]',
};

// daysUntil lives in lib/dates.ts — the partner document sweep and the content
// licence sweep both need it, and two copies would drift.
export { daysUntil } from '../../lib/dates';
