'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function DoseButton({ doseLogId }: { doseLogId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const supabase = createClient();
    await supabase.rpc('mark_dose_taken', { p_dose_log_id: doseLogId });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className="rounded-md bg-[--color-coral] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
    >
      {busy ? '…' : 'Mark taken'}
    </button>
  );
}
