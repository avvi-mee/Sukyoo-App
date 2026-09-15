'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';

type Result = { error?: string; notice?: string };

function friendly(message: string) {
  if (message.includes('not authorized') || message.includes('row-level security')) {
    return 'You do not have permission to do that.';
  }
  // These four raise messages ARE the explanation — paraphrasing them would
  // lose the reason, which is the only useful part.
  for (const marker of [
    'cannot go from',
    'playback URL',
    'needs a reason',
    'unsupported RRULE part',
    'only DAILY and WEEKLY',
    'that series is paused',
  ]) {
    if (message.includes(marker)) return message;
  }
  return message;
}

export async function setState(id: string, state: string, reason: string): Promise<Result> {
  await requirePermission('content.manage');
  if (!['live', 'ended', 'archived', 'cancelled'].includes(state)) return { error: 'Unknown state.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_livestream_state', {
    p_livestream_id: id,
    p_state: state,
    p_reason: reason.trim() || null,
  });
  if (error) return { error: friendly(error.message) };

  revalidatePath('/livestreams');
  return {
    notice:
      state === 'live'
        ? 'On air. Registered viewers were notified at the start.'
        : state === 'cancelled'
          ? 'Cancelled. Its unsent reminders have been removed.'
          : state === 'ended'
            ? 'Ended. Unsent reminders removed and the viewer count cleared.'
            : 'Archived.',
  };
}

export async function setPlaybackUrl(id: string, url: string): Promise<Result> {
  await requirePermission('content.manage');
  const trimmed = url.trim();
  if (trimmed && !/^https:\/\//i.test(trimmed)) {
    // Not a security control — the player enforces transport — but an http URL
    // here would silently fail on iOS under App Transport Security, and the
    // symptom is a blank player nobody can explain.
    return { error: 'Use an https URL; an http stream will not play on iOS.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('livestreams')
    .update({ playback_url: trimmed || null })
    .eq('id', id);
  if (error) return { error: friendly(error.message) };

  revalidatePath('/livestreams');
  return { notice: trimmed ? 'Stream URL saved.' : 'Stream URL cleared.' };
}

export async function scheduleOneOff(input: {
  title: string;
  description: string;
  category: string;
  hostName: string;
  startsAt: string;
  durationMinutes: string;
}): Promise<Result> {
  await requirePermission('content.manage');
  if (input.title.trim().length < 2) return { error: 'Give the broadcast a title.' };
  if (!input.startsAt) return { error: 'Pick a start time.' };

  const duration = Number(input.durationMinutes);
  if (!Number.isInteger(duration) || duration < 1) return { error: 'Duration must be at least 1 minute.' };

  const starts = new Date(input.startsAt);
  if (Number.isNaN(starts.getTime())) return { error: 'That start time is not valid.' };
  if (starts.getTime() < Date.now()) return { error: 'That start time is in the past.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('livestreams')
    .insert({
      title: input.title.trim(),
      description: input.description.trim() || null,
      category: input.category || null,
      host_name: input.hostName.trim() || null,
      starts_at: starts.toISOString(),
      ends_at: new Date(starts.getTime() + duration * 60_000).toISOString(),
    })
    .select('id')
    .single();

  if (error) return { error: friendly(error.message) };

  // Reminders are queued in a second call rather than by a trigger, so that
  // rescheduling a broadcast is an explicit re-queue and not a silent one.
  const { error: reminderError } = await supabase.rpc('schedule_livestream_reminders', {
    p_livestream_id: data.id,
  });

  revalidatePath('/livestreams');
  return {
    notice: reminderError
      ? 'Scheduled, but its reminders could not be queued — check it before it airs.'
      : 'Scheduled. Reminders queued for 24h before, 1h before, and at the start.',
  };
}

export async function saveSeries(input: {
  title: string;
  description: string;
  category: string;
  hostName: string;
  recurrenceRule: string;
  startTime: string;
  durationMinutes: string;
}): Promise<Result> {
  await requirePermission('content.manage');
  if (input.title.trim().length < 2) return { error: 'Give the series a title.' };
  if (!input.startTime) return { error: 'Pick a start time.' };
  if (!/FREQ=/i.test(input.recurrenceRule)) {
    return { error: 'The recurrence rule needs a FREQ, e.g. FREQ=WEEKLY;BYDAY=TU,FR' };
  }

  const duration = Number(input.durationMinutes);
  if (!Number.isInteger(duration) || duration < 1) return { error: 'Duration must be at least 1 minute.' };

  const supabase = await createClient();
  const { error } = await supabase.from('livestream_series').insert({
    title: input.title.trim(),
    description: input.description.trim() || null,
    category: input.category || null,
    host_name: input.hostName.trim() || null,
    recurrence_rule: input.recurrenceRule.trim().toUpperCase(),
    start_time: input.startTime,
    duration_minutes: duration,
  });
  if (error) return { error: friendly(error.message) };

  revalidatePath('/livestreams');
  return { notice: 'Series created. Generate its schedule to create the broadcasts.' };
}

export async function generateSchedule(seriesId: string, horizonDays: number): Promise<Result> {
  await requirePermission('content.manage');

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('generate_livestream_occurrences', {
    p_series_id: seriesId,
    p_horizon_days: horizonDays,
  });
  if (error) return { error: friendly(error.message) };

  const made = Number(data ?? 0);
  return {
    notice:
      made === 0
        ? 'Nothing new — the schedule already covers that window.'
        : `Created ${made} broadcast${made === 1 ? '' : 's'}, each with its reminders queued.`,
  };
}

export async function setSeriesActive(seriesId: string, isActive: boolean): Promise<Result> {
  await requirePermission('content.manage');

  const supabase = await createClient();
  const { error } = await supabase
    .from('livestream_series')
    .update({ is_active: isActive })
    .eq('id', seriesId);
  if (error) return { error: friendly(error.message) };

  revalidatePath('/livestreams');
  return {
    notice: isActive
      ? 'Resumed.'
      : 'Paused. Broadcasts already on the calendar are untouched — cancel them individually if they should not air.',
  };
}
