'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// A self-service signup can only ever request 'senior' or 'family' — this
// local union is the client-side half of the self-service-admin defense; the
// half that can't be bypassed is handle_new_user() itself (see
// supabase/migrations/20260817120000_security_hardening.sql), which coerces
// anything else back to 'senior' regardless of what a modified client sends.
type SignUpRole = 'senior' | 'family';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<SignUpRole>('family');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } =
      mode === 'signUp'
        ? await supabase.auth.signUp({ email, password, options: { data: { role, full_name: fullName } } })
        : await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }

    router.replace('/');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-[--color-line] bg-[--color-surface] p-7">
        <h1 className="text-xl font-extrabold">Sukyoo</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          {mode === 'signUp' ? 'Create your account' : 'Sign in to your account'}
        </p>

        {mode === 'signUp' ? (
          <>
            <label className="mt-6 block text-sm font-medium" htmlFor="fullName">
              Your name
            </label>
            <input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[--color-line] px-3 py-2 text-sm"
            />

            <span className="mt-4 block text-sm font-medium">I am</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('senior')}
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  role === 'senior' ? 'border-[--color-coral] bg-[--color-coral-tint] text-[--color-coral]' : 'border-[--color-line]'
                }`}
              >
                A senior
              </button>
              <button
                type="button"
                onClick={() => setRole('family')}
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  role === 'family' ? 'border-[--color-coral] bg-[--color-coral-tint] text-[--color-coral]' : 'border-[--color-line]'
                }`}
              >
                Family member
              </button>
            </div>
          </>
        ) : null}

        <label className="mt-4 block text-sm font-medium" htmlFor="email">
          Email address
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
          autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-[--color-line] px-3 py-2 text-sm"
        />

        {error ? (
          <p role="alert" className="mt-4 rounded-md bg-[--color-red-tint] px-3 py-2 text-sm text-[--color-red]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || !email || !password || (mode === 'signUp' && !fullName)}
          className="mt-6 w-full rounded-md bg-[--color-coral] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Please wait…' : mode === 'signUp' ? 'Create account' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signUp' ? 'signIn' : 'signUp');
            setError(null);
          }}
          className="mt-4 w-full text-center text-sm font-semibold text-[--color-coral]"
        >
          {mode === 'signUp' ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </form>
    </div>
  );
}
