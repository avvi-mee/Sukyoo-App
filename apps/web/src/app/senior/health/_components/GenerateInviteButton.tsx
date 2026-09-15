'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Invite = { code: string; expires_at: string };

export function GenerateInviteButton() {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('create_family_invite', { p_relationship_type: null });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message.includes('too many') ? "You've generated a lot of codes recently — wait an hour and try again." : rpcError.message);
      return;
    }
    setInvite(data as Invite);
  }

  if (invite) {
    const minutesLeft = Math.max(0, Math.round((new Date(invite.expires_at).getTime() - Date.now()) / 60000));
    return (
      <div className="rounded-xl border border-(--color-coral) bg-(--color-coral-tint) p-4 text-center">
        <p className="text-sm text-(--color-ink-muted)">Share this code with your family member</p>
        <p className="mt-1 text-3xl font-extrabold tracking-widest text-(--color-coral)">{invite.code}</p>
        <p className="mt-1 text-xs text-(--color-ink-muted)">Expires in about {minutesLeft} minute{minutesLeft === 1 ? '' : 's'}</p>
        <button type="button" onClick={handleGenerate} disabled={busy} className="mt-3 text-sm font-semibold text-(--color-coral) underline">
          {busy ? 'Generating…' : 'Generate a new code'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={busy}
        className="rounded-md bg-(--color-coral) px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Generating…' : 'Generate a code to link a family member'}
      </button>
      {error ? <p className="mt-2 text-sm text-(--color-red)">{error}</p> : null}
    </div>
  );
}
