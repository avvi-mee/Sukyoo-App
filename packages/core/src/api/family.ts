import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

// ---------------------------------------------------------------------------
// Pairing (invite code flow — see accept_family_invite in
// 0003_family_pairing.sql for why this can't be a phone-number lookup)
// ---------------------------------------------------------------------------

export function useCreateFamilyInvite() {
  return useMutation({
    mutationFn: async (relationshipType?: string) => {
      const { data, error } = await supabase.rpc('create_family_invite', { p_relationship_type: relationshipType ?? null });
      if (error) throw error;
      return data;
    },
  });
}

export function useAcceptFamilyInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('accept_family_invite', { p_code: code });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['linkedSeniors'] }),
  });
}

// Allowed by profiles' RLS for any actively-linked pair (see 0001) — this is
// just "look up the name/phone of someone I'm linked to", not a sensitive
// resource, so it doesn't need the audited-RPC treatment the health data does.
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useLinkedSeniors(familyMemberId: string | undefined) {
  return useQuery({
    queryKey: ['linkedSeniors', familyMemberId],
    enabled: !!familyMemberId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_links')
        .select('*, senior:profiles!family_links_senior_id_fkey(full_name, phone)')
        .eq('family_member_id', familyMemberId!)
        .eq('status', 'active');
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Shared views — every one of these is the audited RPC path (see 0002/0003):
// denied unless the senior has an active permission_grants row for that
// resource type, and every successful call is logged to audit_log.
// ---------------------------------------------------------------------------

export function useSharedHealthRecords(seniorId: string | undefined) {
  return useQuery({
    queryKey: ['sharedHealthRecords', seniorId],
    enabled: !!seniorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_health_records', { p_owner_id: seniorId! });
      if (error) throw error;
      return data;
    },
  });
}

export function useSharedVitals(seniorId: string | undefined) {
  return useQuery({
    queryKey: ['sharedVitals', seniorId],
    enabled: !!seniorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_vitals', { p_owner_id: seniorId! });
      if (error) throw error;
      return data;
    },
  });
}

export function useSharedMedications(seniorId: string | undefined) {
  return useQuery({
    queryKey: ['sharedMedications', seniorId],
    enabled: !!seniorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_medications', { p_owner_id: seniorId! });
      if (error) throw error;
      return data;
    },
  });
}

export function useSharedDoseLogs(seniorId: string | undefined, forDate?: string) {
  return useQuery({
    queryKey: ['sharedDoseLogs', seniorId, forDate],
    enabled: !!seniorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dose_logs', { p_owner_id: seniorId!, p_for_date: forDate });
      if (error) throw error;
      return data;
    },
  });
}

export function useSharedInsuranceClaims(seniorId: string | undefined) {
  return useQuery({
    queryKey: ['sharedInsuranceClaims', seniorId],
    enabled: !!seniorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_insurance_claims', { p_owner_id: seniorId! });
      if (error) throw error;
      return data;
    },
  });
}

export function useSharedLifeStoryEntries(seniorId: string | undefined) {
  return useQuery({
    queryKey: ['sharedLifeStoryEntries', seniorId],
    enabled: !!seniorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_life_story_entries', { p_owner_id: seniorId! });
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// SOS ack — the family app calls this the instant it foregrounds with a
// pending alert. Push-delivery confirmation alone isn't trustworthy enough
// for a safety path (see the plan's SOS pipeline notes), so this app-level
// ack is the real signal the escalation cron checks.
// ---------------------------------------------------------------------------

export function useAckSosNotification() {
  return useMutation({
    mutationFn: async (input: { sosEventId: string; recipientId: string }) => {
      const { error } = await supabase
        .from('sos_notifications')
        .update({ acked_at: new Date().toISOString() })
        .eq('sos_event_id', input.sosEventId)
        .eq('recipient_id', input.recipientId)
        .is('acked_at', null);
      if (error) throw error;
    },
  });
}
