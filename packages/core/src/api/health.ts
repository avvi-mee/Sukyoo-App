import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import type { BookingMode, HomeCarePricingType, PermissionAccessLevel, PermissionResourceType } from '../database.types';

// ---------------------------------------------------------------------------
// Upcoming appointment (Home dashboard banner)
// ---------------------------------------------------------------------------

export function useUpcomingBooking(patientId: string | undefined) {
  return useQuery({
    queryKey: ['upcomingBooking', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctor_bookings')
        .select(
          '*, slot:doctor_availability_slots(start_at, end_at, mode, doctor:doctor_profiles(specialty, profile:profiles(full_name)))'
        )
        .eq('patient_id', patientId!)
        .eq('status', 'booked')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Vitals
// ---------------------------------------------------------------------------

export function useVitals(ownerId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['vitals', ownerId, limit],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vitals_readings')
        .select('*')
        .eq('owner_id', ownerId!)
        .order('recorded_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useAddVitalReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ownerId: string;
      vitalType: 'blood_pressure' | 'blood_sugar' | 'spo2';
      readingValues: Record<string, number>;
      readingContext?: string;
    }) => {
      const { data, error } = await supabase
        .from('vitals_readings')
        .insert({
          owner_id: input.ownerId,
          recorded_by: input.ownerId,
          vital_type: input.vitalType,
          reading_values: input.readingValues,
          reading_context: input.readingContext ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: ['vitals', input.ownerId] }),
  });
}

// ---------------------------------------------------------------------------
// Medications + daily dose adherence
// ---------------------------------------------------------------------------

export function useMedications(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['medications', ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('owner_id', ownerId!)
        .eq('is_active', true)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

// Materializes + returns today's dose_logs — call this whenever the
// Medication screen opens (see ensure_todays_doses in 0002_health_and_sos.sql).
export function useTodaysDoses(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['todaysDoses', ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ensure_todays_doses', { p_owner_id: ownerId! });
      if (error) throw error;
      return data;
    },
  });
}

export function useMarkDoseTaken(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (doseLogId: string) => {
      const { data, error } = await supabase.rpc('mark_dose_taken', { p_dose_log_id: doseLogId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todaysDoses', ownerId] }),
  });
}

export function useAddMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ownerId: string;
      name: string;
      dosage?: string;
      schedule: { time: string; relation: string }[];
    }) => {
      const { data, error } = await supabase
        .from('medications')
        .insert({ owner_id: input.ownerId, name: input.name, dosage: input.dosage ?? null, schedule: input.schedule })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: ['medications', input.ownerId] }),
  });
}

// ---------------------------------------------------------------------------
// Doctors, availability, bookings
// ---------------------------------------------------------------------------

export function useDoctors(filters?: { mode?: BookingMode; specialty?: string }) {
  return useQuery({
    queryKey: ['doctors', filters],
    queryFn: async () => {
      let query = supabase
        .from('doctor_profiles')
        .select('*, profile:profiles(full_name), org:organizations(name)')
        .eq('is_verified', true);
      if (filters?.specialty) query = query.ilike('specialty', `%${filters.specialty}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useDoctorSlots(doctorId: string | undefined, mode?: BookingMode) {
  return useQuery({
    queryKey: ['doctorSlots', doctorId, mode],
    enabled: !!doctorId,
    queryFn: async () => {
      let query = supabase
        .from('doctor_availability_slots')
        .select('*')
        .eq('doctor_id', doctorId!)
        .eq('is_booked', false)
        .gte('start_at', new Date().toISOString())
        .order('start_at')
        .limit(20);
      if (mode) query = query.eq('mode', mode);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Which booking modes (video/in_person/home_visit) a set of doctors
// currently have at least one open future slot for — drives which mode
// buttons MedicalCareScreen offers per doctor, so it never links to a
// DoctorSlots screen that would just come back empty.
export function useDoctorModes(doctorIds: string[]) {
  return useQuery({
    queryKey: ['doctorModes', doctorIds],
    enabled: doctorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctor_availability_slots')
        .select('doctor_id, mode')
        .in('doctor_id', doctorIds)
        .eq('is_booked', false)
        .gte('start_at', new Date().toISOString());
      if (error) throw error;
      const byDoctor = new Map<string, BookingMode[]>();
      for (const row of data ?? []) {
        const modes = byDoctor.get(row.doctor_id) ?? [];
        if (!modes.includes(row.mode)) modes.push(row.mode);
        byDoctor.set(row.doctor_id, modes);
      }
      return byDoctor;
    },
  });
}

export function useBookDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      slotId: string;
      patientId: string;
      bookedByUserId: string;
      mode: BookingMode;
      addressText?: string;
    }) => {
      // One atomic, row-locking RPC rather than insert-then-best-effort-update
      // — the update half used to silently affect 0 rows with no error,
      // leaving a booked slot listed as available forever (see
      // book_doctor_slot() in the security-hardening migration).
      const { data, error } = await supabase.rpc('book_doctor_slot', {
        p_slot_id: input.slotId,
        p_patient_id: input.patientId,
        p_booked_by_user_id: input.bookedByUserId,
        p_mode: input.mode,
        p_address_text: input.addressText ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['doctorSlots', input.slotId] });
      queryClient.invalidateQueries({ queryKey: ['upcomingBooking', input.patientId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Health records vault
// ---------------------------------------------------------------------------

export function useHealthRecords(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['healthRecords', ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('owner_id', ownerId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUploadHealthRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ownerId: string; recordType: string; fileUri: string; fileName: string }) => {
      const path = `${input.ownerId}/${Date.now()}-${input.fileName}`;
      const response = await fetch(input.fileUri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage.from('health-records').upload(path, blob);
      if (uploadError) throw uploadError;
      const { data, error } = await supabase
        .from('health_records')
        .insert({ owner_id: input.ownerId, uploaded_by: input.ownerId, record_type: input.recordType, storage_path: path })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: ['healthRecords', input.ownerId] }),
  });
}

// ---------------------------------------------------------------------------
// Home healthcare
// ---------------------------------------------------------------------------

export function useHomeHealthcareBookings(seniorId: string | undefined) {
  return useQuery({
    queryKey: ['homeHealthcareBookings', seniorId],
    enabled: !!seniorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_healthcare_bookings')
        .select('*')
        .eq('senior_id', seniorId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRequestHomeHealthcare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      seniorId: string;
      serviceName: string;
      pricingType: HomeCarePricingType;
      quotedAmount?: number;
    }) => {
      const { data, error } = await supabase
        .from('home_healthcare_bookings')
        .insert({
          senior_id: input.seniorId,
          service_name: input.serviceName,
          pricing_type: input.pricingType,
          quoted_amount: input.quotedAmount ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: ['homeHealthcareBookings', input.seniorId] }),
  });
}

// ---------------------------------------------------------------------------
// Wellness
// ---------------------------------------------------------------------------

export function useWellnessSessions() {
  return useQuery({
    queryKey: ['wellnessSessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('wellness_sessions').select('*').order('starts_at');
      if (error) throw error;
      return data;
    },
  });
}

export function useWellnessPrograms() {
  return useQuery({
    queryKey: ['wellnessPrograms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('wellness_programs').select('*');
      if (error) throw error;
      return data;
    },
  });
}

export function useEnrollWellnessSession() {
  return useMutation({
    mutationFn: async (input: { sessionId: string; userId: string }) => {
      const { error } = await supabase
        .from('wellness_session_enrollments')
        .insert({ session_id: input.sessionId, user_id: input.userId });
      if (error) throw error;
    },
  });
}

export function useEnrollWellnessProgram() {
  return useMutation({
    mutationFn: async (input: { programId: string; userId: string }) => {
      const { error } = await supabase
        .from('wellness_program_enrollments')
        .insert({ program_id: input.programId, user_id: input.userId });
      if (error) throw error;
    },
  });
}

// ---------------------------------------------------------------------------
// Insurance (owner viewing their own — direct RLS, not the family RPC path)
// ---------------------------------------------------------------------------

export function useInsurancePolicies(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['insurancePolicies', ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase.from('insurance_policies').select('*').eq('owner_id', ownerId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useInsuranceClaims(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['insuranceClaims', ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_claims')
        .select('*')
        .eq('owner_id', ownerId!)
        .order('filed_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Family links + permission grants ("Family access" toggles)
// ---------------------------------------------------------------------------

export function useFamilyLinks(seniorId: string | undefined) {
  return useQuery({
    queryKey: ['familyLinks', seniorId],
    enabled: !!seniorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_links')
        .select('*, family_member:profiles!family_links_family_member_id_fkey(full_name, phone, date_of_birth)')
        .eq('senior_id', seniorId!)
        .eq('status', 'active');
      if (error) throw error;
      return data;
    },
  });
}

export function usePermissionGrants(familyLinkId: string | undefined) {
  return useQuery({
    queryKey: ['permissionGrants', familyLinkId],
    enabled: !!familyLinkId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_grants')
        .select('*')
        .eq('family_link_id', familyLinkId!)
        .is('revoked_at', null);
      if (error) throw error;
      return data;
    },
  });
}

export function useSetPermissionGrant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      familyLinkId: string;
      resourceType: PermissionResourceType;
      enabled: boolean;
      // 'manage' is required for the 'order' resource type specifically —
      // create_order() only authorizes family-assisted spending on a
      // 'manage' grant, never 'view' (see the security-hardening
      // migration). Defaults to 'view' for every other resource type.
      accessLevel?: PermissionAccessLevel;
    }) => {
      if (input.enabled) {
        const { error } = await supabase.from('permission_grants').insert({
          family_link_id: input.familyLinkId,
          resource_type: input.resourceType,
          access_level: input.accessLevel ?? 'view',
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('permission_grants')
          .update({ revoked_at: new Date().toISOString() })
          .eq('family_link_id', input.familyLinkId)
          .eq('resource_type', input.resourceType)
          .is('revoked_at', null);
        if (error) throw error;
      }
    },
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: ['permissionGrants', input.familyLinkId] }),
  });
}
