'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';

type Result = { error?: string; notice?: string };

/** Semver-ish sanity check. The client compares these numerically, so '1.10' must not arrive as text. */
const VERSION = /^\d+\.\d+\.\d+$/;

export type ReleaseInput = {
  minimumVersion: string;
  latestVersion: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  bannerMessage: string;
  bannerSeverity: string;
};

export async function saveRelease(
  app: string,
  platform: string,
  input: ReleaseInput,
  reason: string
): Promise<Result> {
  await requirePermission('flags.manage');

  if (!VERSION.test(input.minimumVersion)) return { error: 'Minimum version must look like 1.2.3.' };
  if (input.latestVersion && !VERSION.test(input.latestVersion)) {
    return { error: 'Latest version must look like 1.2.3.' };
  }
  if (reason.trim().length < 10) return { error: 'Record why, in at least 10 characters.' };
  if (input.maintenanceMode && input.maintenanceMessage.trim().length < 10) {
    return {
      error:
        'Maintenance mode locks users out of an app with an emergency button in it. It needs a message explaining what is happening and when it will be back.',
    };
  }
  if (input.bannerMessage.trim() && !input.bannerSeverity) {
    return { error: 'Pick a severity for the banner.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_app_release', {
    p_app: app,
    p_platform: platform,
    p_minimum_version: input.minimumVersion,
    p_latest_version: input.latestVersion || null,
    p_maintenance_mode: input.maintenanceMode,
    p_maintenance_message: input.maintenanceMessage.trim() || null,
    p_banner_message: input.bannerMessage.trim() || null,
    p_banner_severity: input.bannerMessage.trim() ? input.bannerSeverity : null,
    p_reason_note: reason.trim(),
  });
  if (error) {
    return {
      error: error.message.includes('not authorized')
        ? 'You do not have permission to do that.'
        : error.message,
    };
  }

  revalidatePath('/releases');
  return {
    notice: input.maintenanceMode
      ? `${app} on ${platform} is now in maintenance mode. Everyone using it is locked out until you turn this off.`
      : 'Saved. Both apps pick this up at next launch.',
  };
}

export async function saveFlag(
  key: string,
  isEnabled: boolean,
  rolloutPercent: number,
  reason: string
): Promise<Result> {
  await requirePermission('flags.manage');
  if (reason.trim().length < 10) return { error: 'Record why, in at least 10 characters.' };
  if (!Number.isInteger(rolloutPercent) || rolloutPercent < 0 || rolloutPercent > 100) {
    return { error: 'Rollout must be a whole number between 0 and 100.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_feature_flag', {
    p_key: key,
    p_is_enabled: isEnabled,
    p_rollout_percent: rolloutPercent,
    p_reason_note: reason.trim(),
  });
  if (error) {
    return {
      error: error.message.includes('not authorized')
        ? 'You do not have permission to do that.'
        : error.message,
    };
  }

  revalidatePath('/releases');
  return {
    notice: !isEnabled
      ? 'Turned off for everyone.'
      : rolloutPercent === 100
        ? 'On for everyone.'
        : `On for about ${rolloutPercent}% of users. A given person stays on the same side of the split between launches.`,
  };
}
