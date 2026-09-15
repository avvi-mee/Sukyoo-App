'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

const ERRORS: Record<string, string> = {
  not_staff: 'That account is not a Sukyoo staff account.',
  no_roles: 'That staff account has no roles assigned yet. Ask an administrator.',
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(ERRORS[params.get('error') ?? ''] ?? null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      // Deliberately not distinguishing "no such account" from "wrong password":
      // this form is internet-facing and the distinction is an account-existence
      // oracle.
      setError('Those details did not work. Check them and try again.');
      setBusy(false);
      return;
    }

    // The password is only the first factor. Middleware sends us to /mfa, which
    // is where the session is actually raised to aal2.
    router.replace('/mfa');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-[--color-line] bg-[--color-surface] p-7"
      >
        <h1 className="text-lg font-bold">Sukyoo Operations</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">Staff sign-in. Two-factor is required.</p>

        <label className="mt-6 block text-sm font-medium" htmlFor="email">
          Work email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-[--color-line] px-3 py-2 text-sm"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-[--color-line] px-3 py-2 text-sm"
        />

        {error ? (
          <p role="alert" className="mt-4 rounded-md bg-[--color-danger-tint] px-3 py-2 text-sm text-[--color-danger]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-md bg-[--color-brand] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Continue'}
        </button>

        <p className="mt-5 text-xs text-[--color-ink-muted]">
          Staff accounts cannot be self-registered. Ask an administrator to provision one.
        </p>
      </form>
    </div>
  );
}
