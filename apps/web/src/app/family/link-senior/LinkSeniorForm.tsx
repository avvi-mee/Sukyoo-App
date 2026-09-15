'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const MESSAGES: Record<string, string> = {
  invalid: 'That invite code is invalid or has expired.',
  self: 'You cannot link to your own account.',
  rate_limited: 'Too many attempts — wait a few minutes and try again.',
};

export function LinkSeniorForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('accept_family_invite', { p_code: code.trim() });

    if (rpcError) {
      setError('Something went wrong. Try again.');
      setBusy(false);
      return;
    }

    const result = data as { status: string };
    if (result.status !== 'ok') {
      setError(MESSAGES[result.status] ?? 'Could not accept that invite code.');
      setBusy(false);
      return;
    }

    router.push('/family');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm rounded-2xl border border-[--color-line] bg-[--color-surface] p-7">
      <h1 className="text-lg font-bold">Link a senior</h1>
      <p className="mt-1 text-sm text-[--color-ink-muted]">
        Ask them to open Settings → Family &amp; sharing in their Sukyoo app and generate a code.
      </p>

      <label className="mt-6 block text-sm font-medium" htmlFor="code">
        Invite code
      </label>
      <input
        id="code"
        required
        autoCapitalize="characters"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        className="mt-1 w-full rounded-md border border-[--color-line] px-3 py-2 text-sm uppercase tracking-widest"
        placeholder="ABCD1234"
      />

      {error ? (
        <p role="alert" className="mt-4 rounded-md bg-[--color-red-tint] px-3 py-2 text-sm text-[--color-red]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !code}
        className="mt-6 w-full rounded-md bg-[--color-coral] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Linking…' : 'Link'}
      </button>
    </form>
  );
}
