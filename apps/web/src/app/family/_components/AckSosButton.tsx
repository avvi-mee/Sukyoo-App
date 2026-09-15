'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AckSosButton({ sosEventId }: { sosEventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleAck() {
    setBusy(true);
    const supabase = createClient();
    // A double-ack race between two family members is expected and
    // harmless (the RPC's transition guard just rejects the second one) —
    // no need to surface that as an error.
    await supabase.rpc('set_sos_event_status', { p_sos_event_id: sosEventId, p_status: 'acked' });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleAck}
      disabled={busy}
      className="rounded-md bg-white px-3 py-1.5 text-sm font-bold text-(--color-red) disabled:opacity-50"
    >
      {busy ? 'Marking…' : "I've seen this"}
    </button>
  );
}
