'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { PermissionAccessLevel, PermissionResourceType } from '@sukyoo/core';

export function PermissionRow({
  familyLinkId,
  resourceType,
  label,
  grantId,
  accessLevel,
  allowManageChoice,
}: {
  familyLinkId: string;
  resourceType: PermissionResourceType;
  label: string;
  grantId: string | null;
  accessLevel: PermissionAccessLevel | null;
  allowManageChoice?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const granted = grantId !== null;

  async function setGranted(next: boolean, level: PermissionAccessLevel = 'view') {
    setBusy(true);
    const supabase = createClient();

    if (next && !granted) {
      await supabase
        .from('permission_grants')
        .insert({ family_link_id: familyLinkId, resource_type: resourceType, access_level: level });
    } else if (!next && granted) {
      await supabase
        .from('permission_grants')
        .update({ revoked_at: new Date().toISOString() })
        .eq('family_link_id', familyLinkId)
        .eq('resource_type', resourceType)
        .is('revoked_at', null);
    } else if (next && granted && grantId) {
      await supabase.from('permission_grants').update({ access_level: level }).eq('id', grantId);
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[--color-line] py-2 last:border-b-0">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={granted}
          disabled={busy}
          onChange={(e) => setGranted(e.target.checked, accessLevel ?? 'view')}
        />
        {label}
      </label>

      {allowManageChoice && granted ? (
        <select
          value={accessLevel ?? 'view'}
          disabled={busy}
          onChange={(e) => setGranted(true, e.target.value as PermissionAccessLevel)}
          className="rounded-md border border-[--color-line] px-2 py-1 text-xs"
        >
          <option value="view">Can view</option>
          <option value="manage">Can place orders</option>
        </select>
      ) : null}
    </div>
  );
}
