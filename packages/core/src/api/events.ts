import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

// ---------------------------------------------------------------------------
// Local events
// ---------------------------------------------------------------------------

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').order('starts_at');
      if (error) throw error;
      return data;
    },
  });
}

export function useRsvpEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { eventId: string; userId: string }) => {
      const { error } = await supabase.from('event_rsvps').insert({ event_id: input.eventId, user_id: input.userId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });
}

// ---------------------------------------------------------------------------
// Clubs
// ---------------------------------------------------------------------------

export function useClubs() {
  return useQuery({
    queryKey: ['clubs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clubs').select('*');
      if (error) throw error;
      return data;
    },
  });
}

export function useJoinClub() {
  return useMutation({
    mutationFn: async (input: { clubId: string; userId: string }) => {
      const { error } = await supabase.from('club_memberships').insert({ club_id: input.clubId, user_id: input.userId });
      if (error) throw error;
    },
  });
}

// ---------------------------------------------------------------------------
// Travel & tours (companion matching is a live query, not a persisted match)
// ---------------------------------------------------------------------------

export function useTravelTrips() {
  return useQuery({
    queryKey: ['travelTrips'],
    queryFn: async () => {
      const { data, error } = await supabase.from('travel_trips').select('*');
      if (error) throw error;
      return data;
    },
  });
}

export function useBookTrip() {
  return useMutation({
    mutationFn: async (input: { tripId: string; userId: string; seekingCompanion: boolean }) => {
      const { error } = await supabase
        .from('trip_bookings')
        .upsert({ trip_id: input.tripId, user_id: input.userId, seeking_companion: input.seekingCompanion }, { onConflict: 'trip_id,user_id' });
      if (error) throw error;
    },
  });
}

// Who else on this trip is looking for a travel companion right now.
export function useTripCompanions(tripId: string | undefined, excludeUserId: string | undefined) {
  return useQuery({
    queryKey: ['tripCompanions', tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_bookings')
        .select('*, profile:profiles(full_name)')
        .eq('trip_id', tripId!)
        .eq('seeking_companion', true)
        .neq('user_id', excludeUserId ?? '');
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Accessible transport
// ---------------------------------------------------------------------------

export function useRequestAccessibleTransport() {
  return useMutation({
    mutationFn: async (input: { userId: string; pickupText: string; scheduledFor?: string }) => {
      const { error } = await supabase
        .from('accessible_transport_bookings')
        .insert({ user_id: input.userId, pickup_text: input.pickupText, scheduled_for: input.scheduledFor ?? null });
      if (error) throw error;
    },
  });
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*');
      if (error) throw error;
      return data;
    },
  });
}

export function useEnrollClass() {
  return useMutation({
    mutationFn: async (input: { classId: string; userId: string }) => {
      const { error } = await supabase.from('class_enrollments').insert({ class_id: input.classId, user_id: input.userId });
      if (error) throw error;
    },
  });
}

// ---------------------------------------------------------------------------
// Entertainment content
// ---------------------------------------------------------------------------

export function useContentItems(category?: string) {
  return useQuery({
    queryKey: ['contentItems', category],
    queryFn: async () => {
      let query = supabase.from('content_items').select('*');
      if (category) query = query.eq('category', category);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useWatchProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ['watchProgress', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('watch_progress').select('*, content:content_items(title)').eq('user_id', userId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveWatchProgress() {
  return useMutation({
    mutationFn: async (input: { userId: string; contentId: string; positionSeconds: number }) => {
      const { error } = await supabase
        .from('watch_progress')
        .upsert(
          { user_id: input.userId, content_id: input.contentId, position_seconds: input.positionSeconds, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,content_id' }
        );
      if (error) throw error;
    },
  });
}

// ---------------------------------------------------------------------------
// Life story (owner's own recordings — shared view lives in family.ts's
// useSharedLifeStoryEntries, same audited-RPC pattern as health records)
// ---------------------------------------------------------------------------

export function useLifeStoryEntries(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['lifeStoryEntries', ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase.from('life_story_entries').select('*').eq('owner_id', ownerId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddLifeStoryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ownerId: string; title: string; entryType: 'audio' | 'video' | 'text'; storagePath?: string; bodyText?: string }) => {
      const { error } = await supabase.from('life_story_entries').insert({
        owner_id: input.ownerId,
        title: input.title,
        entry_type: input.entryType,
        storage_path: input.storagePath ?? null,
        body_text: input.bodyText ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: ['lifeStoryEntries', input.ownerId] }),
  });
}
