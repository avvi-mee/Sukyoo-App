import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';
import { Shell } from '../../components/Shell';
import { can } from '../../lib/permissions';
import { FlagRow, ReleaseRow } from './ReleaseControls';

export const dynamic = 'force-dynamic';

export type Release = {
  app: string;
  platform: string;
  minimum_version: string;
  latest_version: string | null;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  banner_message: string | null;
  banner_severity: string | null;
  updated_at: string;
};

export type Flag = {
  key: string;
  description: string;
  is_enabled: boolean;
  rollout_percent: number;
  updated_at: string;
};

export default async function ReleasesPage() {
  const staff = await requirePermission('flags.manage');
  const supabase = await createClient();

  const [{ data: releases }, { data: flags }] = await Promise.all([
    supabase.from('app_releases').select('*').order('app').order('platform'),
    supabase.from('feature_flags').select('*').order('key'),
  ]);

  const all = (releases ?? []) as Release[];
  const canManage = can(staff, 'flags.manage');
  const inMaintenance = all.filter((r) => r.maintenance_mode);

  return (
    <Shell staff={staff}>
      <header className="mb-6">
        <h1 className="text-xl font-bold">Releases &amp; flags</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          Both apps read this at launch. It is the only way to stop a bad release without shipping another one, which
          for an app carrying an emergency button is not optional.
        </p>
      </header>

      {inMaintenance.length > 0 ? (
        <div className="mb-6 rounded-lg border border-[--color-danger] bg-[--color-danger-tint] p-4 text-sm text-[--color-danger]">
          <p className="font-bold">
            {inMaintenance.length} app/platform combination{inMaintenance.length === 1 ? '' : 's'} in maintenance
            mode
          </p>
          <p className="mt-1">
            Everyone on {inMaintenance.map((r) => `${r.app}/${r.platform}`).join(', ')} is locked out right now,
            including from the SOS button. Turn this off as soon as the work is done.
          </p>
        </div>
      ) : null}

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
        Release matrix
      </h2>
      <div className="mb-8 space-y-3">
        {all.map((release) => (
          <ReleaseRow
            key={`${release.app}-${release.platform}`}
            release={release}
            canManage={canManage}
          />
        ))}
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
        Feature flags
      </h2>
      <p className="mb-3 text-sm text-[--color-ink-muted]">
        A partial rollout buckets users by a hash of their id, so a given person stays on the same side of the split
        between launches rather than seeing a feature appear and disappear.
      </p>
      <div className="space-y-3">
        {((flags ?? []) as Flag[]).map((flag) => (
          <FlagRow key={flag.key} flag={flag} canManage={canManage} />
        ))}
      </div>
    </Shell>
  );
}
