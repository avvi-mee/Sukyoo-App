'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { BookingMode } from '@sukyoo/core';

export function BookSlotButton({ slotId, userId, mode }: { slotId: string; userId: string; mode: BookingMode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('book_doctor_slot', {
      p_slot_id: slotId,
      p_patient_id: userId,
      p_booked_by_user_id: userId,
      p_mode: mode,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message.includes('already booked') ? 'That slot was just taken — pick another.' : rpcError.message);
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) return <span className="text-sm font-semibold text-(--color-green)">Booked</span>;

  return (
    <div className="text-right">
      <button
        onClick={handleClick}
        disabled={busy}
        className="rounded-md bg-(--color-coral) px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Booking…' : 'Book'}
      </button>
      {error ? <p className="mt-1 text-xs text-(--color-red)">{error}</p> : null}
    </div>
  );
}
