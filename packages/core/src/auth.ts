import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { UserRole } from './database.types';

export function sendOtp(phone: string, meta?: { role?: UserRole; full_name?: string }) {
  return supabase.auth.signInWithOtp({
    phone,
    options: { data: meta, shouldCreateUser: true },
  });
}

export function verifyOtp(phone: string, token: string) {
  return supabase.auth.verifyOtp({ phone, token, type: 'sms' });
}

// A self-service signup can only ever request 'senior' or 'family' — this
// local union, not the full UserRole type, is the client-side half of the
// self-service-admin defense. The half that can't be bypassed by a modified
// client is handle_new_user() itself (see
// supabase/migrations/20260817120000_security_hardening.sql), which coerces
// anything else to 'senior' regardless of what a client sends here.
export type SignUpRole = 'senior' | 'family';

export function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUpWithEmail(email: string, password: string, meta: { role: SignUpRole; full_name: string }) {
  return supabase.auth.signUp({ email, password, options: { data: meta } });
}

export function signOut() {
  return supabase.auth.signOut();
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
