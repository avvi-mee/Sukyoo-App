'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '../../lib/auth';
import { recordStaffAction } from '../../lib/audit';
import { createClient } from '../../lib/supabase/server';

/**
 * Revokes a pairing on a senior's behalf.
 *
 * IMPORTANT LIMITATION, deliberately not worked around: set_family_link_status()
 * is senior-only (`where senior_id = auth.uid()`), so this cannot actually flip
 * the row — staff have no write path into another person's consent, by design.
 *
 * What this does instead is record the request in the audit trail so a human can
 * action it with the senior. Giving ops the ability to silently rewrite consent
 * would undermine the entire permission model; the honest UI is one that says it
 * needs the senior.
 *
 * If unattended revocation is ever genuinely required (a DPDP erasure request,
 * a safeguarding case), it needs its own reviewed RPC with a second approver —
 * not a widening of this one.
 */
export async function requestLinkRevocation(linkId: string, note: string) {
  await requirePermission('compliance.manage');
  if (note.trim().length < 10) {
    return { error: 'Record why this pairing should be revoked, in at least 10 characters.' };
  }

  const supabase = await createClient();
  const { data: link } = await supabase
    .from('family_links')
    .select('id, senior_id')
    .eq('id', linkId)
    .maybeSingle();

  if (!link) return { error: 'That pairing no longer exists.' };

  const logged = await recordStaffAction({
    resourceType: 'family_link_revocation_requested',
    resourceId: linkId,
    ownerId: link.senior_id,
    reason: 'compliance_review',
    reasonNote: note,
  });
  if (logged.error) return { error: logged.error };

  revalidatePath('/pairings');
  return {
    notice:
      'Logged. Consent can only be withdrawn by the senior themselves — contact them to complete this, or raise a data-subject request if they cannot.',
  };
}
