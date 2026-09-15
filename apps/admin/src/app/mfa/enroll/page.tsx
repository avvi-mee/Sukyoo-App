'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

// Enrolment is mandatory and unskippable: the middleware sends any staff account
// with no verified factor here and won't let it reach a console route. There is
// deliberately no "remind me later".
export default function EnrollMfaPage() {
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function begin() {
      // Clear out any half-finished attempt, or enrol() rejects as a duplicate.
      // `.all` rather than `.totp` — the latter is typed to verified factors
      // only, and an abandoned enrolment is exactly the unverified case we need
      // to find here.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const factor of existing?.all ?? []) {
        if (factor.factor_type === 'totp' && factor.status === 'unverified') {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Sukyoo Ops ${new Date().toISOString().slice(0, 10)}`,
      });

      if (enrollError || !data) {
        setError('Could not start enrolment. Ask an administrator to check that MFA is enabled.');
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    }

    begin();
  }, []);

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
      setError('That code was not accepted. Check your device clock and try the next code.');
      setBusy(false);
      return;
    }

    window.location.assign('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={handleVerify}
        className="w-full max-w-md rounded-xl border border-[--color-line] bg-[--color-surface] p-7"
      >
        <h1 className="text-lg font-bold">Set up two-factor</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          This console can reach seniors&rsquo; health records, so two-factor is required before you can sign in.
        </p>

        {qr ? (
          <>
            {/* Supabase returns the QR as an inline SVG data URI — no external
                image host is involved. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Two-factor setup QR code" className="mx-auto mt-6 h-48 w-48" />
            <details className="mt-3 text-xs text-[--color-ink-muted]">
              <summary className="cursor-pointer">Can&rsquo;t scan it?</summary>
              <p className="mt-2 break-all font-mono">{secret}</p>
            </details>
          </>
        ) : (
          <p className="mt-6 text-sm text-[--color-ink-muted]">Preparing your setup code…</p>
        )}

        <label className="mt-6 block text-sm font-medium" htmlFor="code">
          Enter the 6-digit code to confirm
        </label>
        <input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="mt-1 w-full rounded-md border border-[--color-line] px-3 py-2 text-center text-xl tracking-[0.4em]"
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
          {busy ? 'Confirming…' : 'Confirm and continue'}
        </button>
      </form>
    </div>
  );
}
