'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

// The second factor. Until this succeeds the session sits at aal1 and the
// middleware refuses every console route — a stolen password on its own gets
// nowhere.
export default function MfaPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp?.find((f) => f.status === 'verified');
      if (!verified) {
        router.replace('/mfa/enroll');
        return;
      }
      setFactorId(verified.id);
    });
  }, [router]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setError('Could not start verification. Try again.');
      setBusy(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });

    if (verifyError) {
      setError('That code was not accepted. Codes expire every 30 seconds.');
      setBusy(false);
      return;
    }

    // Full reload so the middleware re-reads the now-aal2 session cookie.
    window.location.assign('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={handleVerify}
        className="w-full max-w-sm rounded-xl border border-[--color-line] bg-[--color-surface] p-7"
      >
        <h1 className="text-lg font-bold">Two-factor code</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          Enter the 6-digit code from your authenticator app.
        </p>

        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          aria-label="Six digit authentication code"
          className="mt-5 w-full rounded-md border border-[--color-line] px-3 py-2 text-center text-xl tracking-[0.4em]"
        />

        {error ? (
          <p role="alert" className="mt-4 rounded-md bg-[--color-danger-tint] px-3 py-2 text-sm text-[--color-danger]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || code.length !== 6 || !factorId}
          className="mt-6 w-full rounded-md bg-[--color-brand] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </div>
  );
}
