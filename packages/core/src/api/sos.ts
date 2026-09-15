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
      return data as { sos_event_id: string; recipients: number; delivered: number };
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

// The family app's Home screen equivalent: every currently-open SOS event
// across every senior the signed-in family member is linked to, not just
// one — an emergency for the senior you weren't currently looking at is the
// case that matters most. sos_events has no family-facing "list mine"
// policy of its own; sos_events_select_senior_or_family already covers this
// filter row-by-row, a plain .in() query is enough.
export function useActiveSOSEvents(seniorIds: string[]) {
  const queryClient = useQueryClient();
  const key = [...seniorIds].sort().join(',');
  const queryKey = ['activeSosEvents', key];

  const query = useQuery({
    queryKey,
    enabled: seniorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sos_events')
        .select('*')
        .in('senior_id', seniorIds)
        .in('status', ['triggered', 'acked'])
        .order('triggered_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!seniorIds.length) return;
    const channel = supabase
      .channel(`sos-events-family-${key}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_events' }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, queryClient]);

  return query;
}

// Acks the SOS event itself (moves it off 'triggered'), not just the
// delivery record — see set_sos_event_status() in the security-hardening
// migration. Acking only sos_notifications (the old behaviour) left the
// senior's own screen showing an unanswered alert forever.
export function useAckSosEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sosEventId: string) => {
      const { data, error } = await supabase.rpc('set_sos_event_status', {
        p_sos_event_id: sosEventId,
        p_status: 'acked',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSosEvent'] });
      queryClient.invalidateQueries({ queryKey: ['activeSosEvents'] });
    },
  });
}
