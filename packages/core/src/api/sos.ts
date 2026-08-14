import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export function useEmergencyContacts(seniorId: string | undefined) {
  return useQuery({
    queryKey: ['emergencyContacts', seniorId],
    enabled: !!seniorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('senior_id', seniorId!)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddEmergencyContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      seniorId: string;
      contactType: 'family' | 'physician';
      displayName: string;
      phone: string;
      isPrimary?: boolean;
      familyLinkId?: string;
    }) => {
      const { error } = await supabase.from('emergency_contacts').insert({
        senior_id: input.seniorId,
        contact_type: input.contactType,
        display_name: input.displayName,
        phone: input.phone,
        is_primary: input.isPrimary ?? false,
        family_link_id: input.familyLinkId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: ['emergencyContacts', input.seniorId] }),
  });
}

// Hold-to-confirm SOS trigger. Calls the sos-trigger Edge Function (service
// role on the server side — inserts sos_events + fans out sos_notifications,
// see supabase/functions/sos-trigger). Requires a deployed Supabase project;
// there is no client-side fallback insert by design (see 0002's RLS notes).
export function useTriggerSOS() {
  return useMutation({
    mutationFn: async (input: { latitude?: number; longitude?: number }) => {
      const { data, error } = await supabase.functions.invoke('sos-trigger', {
        body: { latitude: input.latitude, longitude: input.longitude },
      });
      if (error) throw error;
      return data as { sos_event_id: string };
    },
  });
}

// The senior's own most recent open SOS event, kept live via Realtime so the
// SOSActive screen can show ack/escalation status without polling.
export function useActiveSOSEvent(seniorId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['activeSosEvent', seniorId];

  const query = useQuery({
    queryKey,
    enabled: !!seniorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sos_events')
        .select('*')
        .eq('senior_id', seniorId!)
        .in('status', ['triggered', 'acked'])
        .order('triggered_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!seniorId) return;
    const channel = supabase
      .channel(`sos-events-${seniorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_events', filter: `senior_id=eq.${seniorId}` }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [seniorId, queryClient]);

  return query;
}
