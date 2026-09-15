'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '../../lib/auth';
import { recordStaffAction } from '../../lib/audit';
import { createClient } from '../../lib/supabase/server';

// Every mutation here demands a note. An SOS timeline with "resolved" and no
// explanation is useless at 3am on the next shift, and worse in an inquest.
const MIN_NOTE = 10;

export async function acknowledgeEvent(sosEventId: string, note: string) {
  await requirePermission('sos.manage');
  if (note.trim().length < MIN_NOTE) return { error: 'Say what you are doing, in at least 10 characters.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('ack_sos_event', { p_sos_event_id: sosEventId });
  if (error) return { error: 'Could not acknowledge this event.' };

  await recordStaffAction({
    resourceType: 'sos_event_ack',
    resourceId: sosEventId,
    reason: 'sos_response',
    reasonNote: note,
  });

  revalidatePath('/sos');
  return {};
}

export async function recordDispatch(args: {
  sosEventId: string;
  dispatchStatus: string;
  etaMinutes: number | null;
  note: string;
}) {
  await requirePermission('sos.manage');
  if (args.note.trim().length < MIN_NOTE) return { error: 'A dispatch note of at least 10 characters is required.' };

  const supabase = await createClient();
  const { error } = await supabase.from('care_dispatch').insert({
    sos_event_id: args.sosEventId,
    dispatch_status: args.dispatchStatus,
    eta_minutes: args.etaMinutes,
    notes: args.note.trim(),
  });
  if (error) return { error: 'Could not record the dispatch.' };

  await recordStaffAction({
    resourceType: 'care_dispatch',
    resourceId: args.sosEventId,
    reason: 'sos_response',
    reasonNote: args.note,
  });

  revalidatePath('/sos');
  return {};
}

export async function resolveEvent(sosEventId: string, note: string) {
  await requirePermission('sos.manage');
  if (note.trim().length < MIN_NOTE) return { error: 'Say how this was resolved, in at least 10 characters.' };

  const supabase = await createClient();

  // resolve_sos_event() is senior-only by design (0008) — a senior closes their
  // own alert. Ops closing one out is a different act, so it is recorded on
  // care_dispatch and in the audit trail rather than by rewriting the event's
  // own status. The senior's view of their alert stays theirs.
  const { error } = await supabase.from('care_dispatch').insert({
    sos_event_id: sosEventId,
    dispatch_status: 'closed_by_ops',
    notes: note.trim(),
  });
  if (error) return { error: 'Could not close this event.' };

  await recordStaffAction({
    resourceType: 'sos_event_close',
    resourceId: sosEventId,
    reason: 'sos_response',
    reasonNote: note,
  });

  revalidatePath('/sos');
  return {};
}
