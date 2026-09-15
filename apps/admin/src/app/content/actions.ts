'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';

type Result = { error?: string; notice?: string };

const PUBLISH_STATUSES = ['draft', 'scheduled', 'published', 'withdrawn'] as const;

function friendly(message: string) {
  if (message.includes('not authorized')) return 'You do not have permission to do that.';
  if (message.includes('content_items_licence_window')) {
    return 'The licence end date cannot be before the start date.';
  }
  if (message.includes('row-level security')) return 'You do not have permission to do that.';
  return message;
}

export type TitleInput = {
  title: string;
  category: string;
  licensor: string;
  territory: string;
  licensedFrom: string;
  licensedUntil: string;
  licenceReference: string;
  mediaUrl: string;
  durationSeconds: string;
  contentWarning: string;
};

/**
 * Creates or updates a title.
 *
 * publish_status is NOT settable here — it moves only through publishTitle()
 * below, which refuses to publish a title with no licence start date. Letting
 * this form write the status would make that check bypassable by editing
 * anything else on the row.
 */
export async function saveTitle(id: string | null, input: TitleInput): Promise<Result> {
  await requirePermission('content.manage');

  if (input.title.trim().length < 2) return { error: 'Give the title a name.' };
  if (input.licensedUntil && input.licensedFrom && input.licensedUntil < input.licensedFrom) {
    return { error: 'The licence end date cannot be before the start date.' };
  }

  const duration = input.durationSeconds.trim() ? Number(input.durationSeconds) : null;
  if (duration !== null && (!Number.isInteger(duration) || duration <= 0)) {
    return { error: 'Duration must be a whole number of seconds.' };
  }

  const row = {
    title: input.title.trim(),
    category: input.category || null,
    licensor: input.licensor.trim() || null,
    territory: input.territory.trim().toUpperCase() || 'IN',
    licensed_from: input.licensedFrom || null,
    licensed_until: input.licensedUntil || null,
    licence_reference: input.licenceReference.trim() || null,
    media_url: input.mediaUrl.trim() || null,
    duration_seconds: duration,
    content_warning: input.contentWarning.trim() || null,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from('content_items').update(row).eq('id', id)
    : await supabase.from('content_items').insert(row);

  if (error) return { error: friendly(error.message) };

  revalidatePath('/content');
  return { notice: id ? 'Saved.' : 'Title created as a draft.' };
}

/**
 * Moves a title's publish status.
 *
 * The licence check lives here rather than only in the database because the
 * error a database CHECK would give ("violates constraint") is useless to an
 * operator. The database still hides an unlicensed title regardless — the RLS
 * policy requires licensed_from, so publishing without one produces a title
 * nobody can see rather than an unlicensed one that everybody can.
 */
export async function setPublishStatus(id: string, status: string): Promise<Result> {
  await requirePermission('content.manage');
  if (!PUBLISH_STATUSES.includes(status as (typeof PUBLISH_STATUSES)[number])) {
    return { error: 'Unknown status.' };
  }

  const supabase = await createClient();
  const { data: title } = await supabase
    .from('content_items')
    .select('title, licensed_from, licensed_until, licensor, media_url')
    .eq('id', id)
    .maybeSingle();
  if (!title) return { error: 'That title no longer exists.' };

  if (status === 'published') {
    if (!title.licensed_from) {
      return {
        error:
          'Record the licence start date first. Without one the title stays hidden anyway — the catalogue policy treats a blank date as "nobody filled this in", not "available forever".',
      };
    }
    if (!title.licensor) return { error: 'Record who licensed this before publishing it.' };
    if (!title.media_url) return { error: 'There is no media URL, so this would publish an empty player.' };
  }

  const { error } = await supabase.from('content_items').update({ publish_status: status }).eq('id', id);
  if (error) return { error: friendly(error.message) };

  revalidatePath('/content');
  return {
    notice:
      status === 'published'
        ? title.licensed_until
          ? `Published. It will disappear on its own after ${title.licensed_until}.`
          : 'Published with no end date, so it stays until withdrawn.'
        : 'Status updated.',
  };
}

export async function resolveReport(reportId: string, status: string, note: string): Promise<Result> {
  await requirePermission('content.manage');
  if (!['actioned', 'dismissed'].includes(status)) return { error: 'Unknown outcome.' };
  if (note.trim().length < 10) {
    return { error: 'Say what you did or why not, in at least 10 characters.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('resolve_content_report', {
    p_report_id: reportId,
    p_status: status,
    p_note: note.trim(),
  });
  if (error) {
    return {
      error: error.message.includes('not open')
        ? 'Somebody else already resolved that report.'
        : friendly(error.message),
    };
  }

  revalidatePath('/content/reports');
  return { notice: `Marked ${status}.` };
}
