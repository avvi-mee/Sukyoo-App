import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import type { Database } from '../database.types';

type CallTokenResponse = { callSessionId: string; channelName: string; token: string; agoraAppId: string };

// Starts a new call: creates the call_sessions row + pushes an incoming-call
// alert to the callee, server-side (see supabase/functions/calls-token).
export function useStartCall() {
  return useMutation({
    mutationFn: async (calleeId: string) => {
      const { data, error } = await supabase.functions.invoke('calls-token', { body: { calleeId } });
      if (error) throw error;
      return data as CallTokenResponse;
    },
  });
}

// Fetches a token for an existing call (the callee answering, or the caller
// re-fetching if their first token expired before the call was picked up).
export function useCallToken() {
  return useMutation({
    mutationFn: async (callSessionId: string) => {
      const { data, error } = await supabase.functions.invoke('calls-token', { body: { callSessionId } });
      if (error) throw error;
      return data as CallTokenResponse;
    },
  });
}

export function useUpdateCallStatus() {
  return useMutation({
    mutationFn: async (input: { callSessionId: string; status: 'active' | 'ended' | 'missed' | 'declined' }) => {
      const patch: Database['public']['Tables']['call_sessions']['Update'] = { status: input.status };
      if (input.status === 'active') patch.started_at = new Date().toISOString();
      if (input.status === 'ended' || input.status === 'declined') patch.ended_at = new Date().toISOString();
      const { error } = await supabase.from('call_sessions').update(patch).eq('id', input.callSessionId);
      if (error) throw error;
    },
  });
}

// Live-updates whenever a new call rings in for this user — the screen
// listening to this is expected to show/dismiss an in-app incoming-call UI;
// the killed-state case is handled separately by the same push+background-
// task+full-screen-notification pattern as SOS (see backgroundTask.ts).
export function useIncomingCall(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['incomingCall', userId];

  const query = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('callee_id', userId!)
        .eq('status', 'ringing')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`call-sessions-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_sessions', filter: `callee_id=eq.${userId}` }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}
