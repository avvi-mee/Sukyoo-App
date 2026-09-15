'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function RevokeLinkButton({ linkId, seniorName }: { linkId: string; seniorName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleRevoke() {
    if (!window.confirm(`Unlink from ${seniorName}? You'll need a new invite code to link again.`)) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.rpc('set_family_link_status', { p_link_id: linkId, p_status: 'revoked' });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRevoke}
      disabled={busy}
      className="rounded-md border border-(--color-red) px-3 py-1.5 text-sm font-semibold text-(--color-red) disabled:opacity-50"
    >
      {busy ? 'Revoking…' : 'Revoke link'}
    </button>
  );
}
