'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function RsvpButton({ eventId, userId, rsvped }: { eventId: string; userId: string; rsvped: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const supabase = createClient();
    if (rsvped) {
      await supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', userId);
    } else {
      await supabase.from('event_rsvps').insert({ event_id: eventId, user_id: userId });
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
        rsvped ? 'border border-[--color-amber] text-[--color-amber]' : 'bg-[--color-amber] text-white'
      }`}
    >
      {busy ? '…' : rsvped ? "I'm going" : 'RSVP'}
    </button>
  );
}
