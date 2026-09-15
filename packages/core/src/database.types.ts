// Hand-written to match supabase/migrations/*.sql.
// Once a real Supabase project exists, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > packages/core/src/database.types.ts
// and this file (and this comment) goes away.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Row + the subset of keys that must be supplied on insert (everything else
// has a default or is nullable) — cuts the Insert/Update boilerplate below.
type Insertable<Row, Required extends keyof Row> = Partial<Row> & Pick<Row, Required>;

export type UserRole = 'senior' | 'family' | 'doctor' | 'vendor' | 'ops_agent' | 'care_team' | 'admin';
export type OrgType = 'hospital' | 'clinic' | 'lab' | 'vendor' | 'insurer' | 'ngo' | 'home_healthcare_provider';
export type FamilyLinkStatus = 'pending' | 'active' | 'revoked';
export type PermissionResourceType =
  | 'health_record'
  | 'vitals'
  | 'medication'
  | 'insurance_claim'
  | 'insurance_policy'
  | 'order'
  | 'life_story_entry';
export type PermissionAccessLevel = 'view' | 'manage';
export type BookingMode = 'video' | 'in_person' | 'home_visit';
export type BookingStatus = 'booked' | 'completed' | 'cancelled';
export type HomeCarePricingType = 'per_visit' | 'per_session' | 'hourly' | 'daily' | 'live_in' | 'custom';
export type SosStatus = 'triggered' | 'acked' | 'resolved' | 'cancelled';
export type VitalStatus = 'low' | 'normal' | 'high';
export type CallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'declined';
export type OrderedByRole = 'self' | 'family' | 'ops_agent';
export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled';
export type PaymentStatus = 'created' | 'captured' | 'failed' | 'refunded';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string | null;
          phone: string | null;
          date_of_birth: string | null;
          pincode: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Insertable<Database['public']['Tables']['profiles']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          type: OrgType;
          name: string;
          kyc_status: string;
          default_commission_rate: number;
          payout_details: Json | null;
          is_verified: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['organizations']['Row']>;
        Update: Partial<Database['public']['Tables']['organizations']['Row']>;
        Relationships: [];
      };
      org_members: {
        Row: { org_id: string; user_id: string; role: string; created_at: string };
        Insert: Insertable<Database['public']['Tables']['org_members']['Row'], 'org_id' | 'user_id'>;
        Update: Partial<Database['public']['Tables']['org_members']['Row']>;
        Relationships: [];
      };
      family_links: {
        Row: {
          id: string;
          senior_id: string;
          family_member_id: string;
          relationship_type: string | null;
          status: FamilyLinkStatus;
          is_primary_contact: boolean;
          created_at: string;
        };
        Insert: Insertable<Database['public']['Tables']['family_links']['Row'], 'senior_id' | 'family_member_id'>;
        Update: Partial<Database['public']['Tables']['family_links']['Row']>;
        Relationships: [
          { foreignKeyName: 'family_links_senior_id_fkey'; columns: ['senior_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'family_links_family_member_id_fkey'; columns: ['family_member_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ];
      };
      permission_grants: {
        Row: {
          id: string;
          family_link_id: string;
          resource_type: PermissionResourceType;
          resource_id: string | null;
          access_level: PermissionAccessLevel;
          granted_at: string;
          revoked_at: string | null;
        };
        Insert: Insertable<Database['public']['Tables']['permission_grants']['Row'], 'family_link_id' | 'resource_type'>;
        Update: Partial<Database['public']['Tables']['permission_grants']['Row']>;
        Relationships: [];
      };
      doctor_profiles: {
        Row: {
          user_id: string;
          org_id: string | null;
          specialty: string | null;
          medical_council_reg_no: string | null;
          years_experience: number | null;
          is_verified: boolean;
          bio: string | null;
        };
        Insert: Insertable<Database['public']['Tables']['doctor_profiles']['Row'], 'user_id'>;
        Update: Partial<Database['public']['Tables']['doctor_profiles']['Row']>;
        Relationships: [
          { foreignKeyName: 'doctor_profiles_user_id_fkey'; columns: ['user_id']; isOneToOne: true; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'doctor_profiles_org_id_fkey'; columns: ['org_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id'] }
        ];
      };
      doctor_availability_slots: {
        Row: {
          id: string;
          doctor_id: string;
          org_id: string | null;
          start_at: string;
          end_at: string;
          mode: BookingMode;
          is_booked: boolean;
        };
        Insert: Insertable<Database['public']['Tables']['doctor_availability_slots']['Row'], 'doctor_id' | 'start_at' | 'end_at' | 'mode'>;
        Update: Partial<Database['public']['Tables']['doctor_availability_slots']['Row']>;
        Relationships: [
          { foreignKeyName: 'doctor_availability_slots_doctor_id_fkey'; columns: ['doctor_id']; isOneToOne: false; referencedRelation: 'doctor_profiles'; referencedColumns: ['user_id'] }
        ];
      };
      doctor_bookings: {
        Row: {
          id: string;
          slot_id: string;
          patient_id: string;
          booked_by_user_id: string;
          mode: BookingMode;
          address_text: string | null;
          call_session_id: string | null;
          status: BookingStatus;
          created_at: string;
        };
        Insert: Insertable<
          Database['public']['Tables']['doctor_bookings']['Row'],
          'slot_id' | 'patient_id' | 'booked_by_user_id' | 'mode'
        >;
        Update: Partial<Database['public']['Tables']['doctor_bookings']['Row']>;
        Relationships: [
          { foreignKeyName: 'doctor_bookings_slot_id_fkey'; columns: ['slot_id']; isOneToOne: true; referencedRelation: 'doctor_availability_slots'; referencedColumns: ['id'] }
        ];
      };
      threshold_rules: {
        Row: { vital_type: string; metric: string; unit: string | null; normal_min: number | null; normal_max: number | null };
        Insert: Database['public']['Tables']['threshold_rules']['Row'];
        Update: Partial<Database['public']['Tables']['threshold_rules']['Row']>;
        Relationships: [];
      };
      vitals_readings: {
        Row: {
          id: string;
          owner_id: string;
          recorded_by: string;
          vital_type: string;
          reading_context: string | null;
          reading_values: Json;
          status: VitalStatus | null;
          recorded_at: string;
        };
        Insert: Insertable<
          Database['public']['Tables']['vitals_readings']['Row'],
          'owner_id' | 'recorded_by' | 'vital_type' | 'reading_values'
        >;
        Update: Partial<Database['public']['Tables']['vitals_readings']['Row']>;
        Relationships: [];
      };
      health_records: {
        Row: {
          id: string;
          owner_id: string;
          uploaded_by: string;
          record_type: string;
          storage_path: string;
          doctor_booking_id: string | null;
          created_at: string;
        };
        Insert: Insertable<
          Database['public']['Tables']['health_records']['Row'],
          'owner_id' | 'uploaded_by' | 'record_type' | 'storage_path'
        >;
        Update: Partial<Database['public']['Tables']['health_records']['Row']>;
        Relationships: [];
      };
      medications: {
        Row: {
          id: string;
          owner_id: string;
          prescribed_by: string | null;
          name: string;
          dosage: string | null;
          schedule: Json;
          doses_remaining: number | null;
          refill_threshold: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Insertable<Database['public']['Tables']['medications']['Row'], 'owner_id' | 'name' | 'schedule'>;
        Update: Partial<Database['public']['Tables']['medications']['Row']>;
        Relationships: [];
      };
      dose_logs: {
        Row: { id: string; medication_id: string; scheduled_for: string; taken_at: string | null; status: string };
        Insert: Insertable<Database['public']['Tables']['dose_logs']['Row'], 'medication_id' | 'scheduled_for'>;
        Update: Partial<Database['public']['Tables']['dose_logs']['Row']>;
        Relationships: [];
      };
      home_healthcare_bookings: {
        Row: {
          id: string;
          senior_id: string;
          provider_org_id: string | null;
          service_name: string;
          pricing_type: HomeCarePricingType;
          quoted_amount: number | null;
          status: string;
          scheduled_for: string | null;
          created_at: string;
        };
        Insert: Insertable<
          Database['public']['Tables']['home_healthcare_bookings']['Row'],
          'senior_id' | 'service_name' | 'pricing_type'
        >;
        Update: Partial<Database['public']['Tables']['home_healthcare_bookings']['Row']>;
        Relationships: [];
      };
      wellness_sessions: {
        Row: { id: string; title: string; starts_at: string; stream_url: string | null; created_at: string };
        Insert: Insertable<Database['public']['Tables']['wellness_sessions']['Row'], 'title' | 'starts_at'>;
        Update: Partial<Database['public']['Tables']['wellness_sessions']['Row']>;
        Relationships: [];
      };
      wellness_session_enrollments: {
        Row: { session_id: string; user_id: string };
        Insert: Database['public']['Tables']['wellness_session_enrollments']['Row'];
        Update: Partial<Database['public']['Tables']['wellness_session_enrollments']['Row']>;
        Relationships: [];
      };
      wellness_programs: {
        Row: { id: string; title: string; description: string | null; duration_weeks: number | null };
        Insert: Insertable<Database['public']['Tables']['wellness_programs']['Row'], 'title'>;
        Update: Partial<Database['public']['Tables']['wellness_programs']['Row']>;
        Relationships: [];
      };
      wellness_program_enrollments: {
        Row: { program_id: string; user_id: string; enrolled_at: string };
        Insert: Insertable<Database['public']['Tables']['wellness_program_enrollments']['Row'], 'program_id' | 'user_id'>;
        Update: Partial<Database['public']['Tables']['wellness_program_enrollments']['Row']>;
        Relationships: [];
      };
      insurance_policies: {
        Row: {
          id: string;
          owner_id: string;
          provider_org_id: string | null;
          policy_number: string;
          cover_amount: number | null;
          valid_till: string | null;
          created_at: string;
        };
        Insert: Insertable<Database['public']['Tables']['insurance_policies']['Row'], 'owner_id' | 'policy_number'>;
        Update: Partial<Database['public']['Tables']['insurance_policies']['Row']>;
        Relationships: [];
      };
      insurance_claims: {
        Row: { id: string; policy_id: string; owner_id: string; claim_type: string | null; status: string; filed_at: string };
        Insert: Insertable<Database['public']['Tables']['insurance_claims']['Row'], 'policy_id' | 'owner_id'>;
        Update: Partial<Database['public']['Tables']['insurance_claims']['Row']>;
        Relationships: [];
      };
      emergency_contacts: {
        Row: {
          id: string;
          senior_id: string;
          family_link_id: string | null;
          contact_type: string;
          display_name: string | null;
          phone: string | null;
          is_primary: boolean;
        };
        Insert: Insertable<Database['public']['Tables']['emergency_contacts']['Row'], 'senior_id' | 'contact_type'>;
        Update: Partial<Database['public']['Tables']['emergency_contacts']['Row']>;
        Relationships: [];
      };
      sos_events: {
        Row: {
          id: string;
          senior_id: string;
          status: SosStatus;
          latitude: number | null;
          longitude: number | null;
          triggered_at: string;
          resolved_at: string | null;
        };
        Insert: Insertable<Database['public']['Tables']['sos_events']['Row'], 'senior_id'>;
        Update: Partial<Database['public']['Tables']['sos_events']['Row']>;
        Relationships: [];
      };
      sos_notifications: {
        Row: {
          id: string;
          sos_event_id: string;
          recipient_id: string | null;
          channel: string;
          attempt: number;
          sent_at: string;
          acked_at: string | null;
          status: string;
        };
        Insert: Insertable<Database['public']['Tables']['sos_notifications']['Row'], 'sos_event_id' | 'channel'>;
        Update: Partial<Database['public']['Tables']['sos_notifications']['Row']>;
        Relationships: [];
      };
      care_dispatch: {
        Row: {
          id: string;
          sos_event_id: string;
          partner_org_id: string | null;
          eta_minutes: number | null;
          dispatch_status: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Insertable<Database['public']['Tables']['care_dispatch']['Row'], 'sos_event_id'>;
        Update: Partial<Database['public']['Tables']['care_dispatch']['Row']>;
        Relationships: [];
      };
      push_tokens: {
        Row: { user_id: string; token: string; platform: string; updated_at: string };
        Insert: Insertable<Database['public']['Tables']['push_tokens']['Row'], 'user_id' | 'token'>;
        Update: Partial<Database['public']['Tables']['push_tokens']['Row']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Insertable<Database['public']['Tables']['notifications']['Row'], 'user_id' | 'type' | 'title'>;
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string;
          action: string;
          resource_type: string;
          resource_id: string | null;
          owner_id: string | null;
          accessed_at: string;
        };
        Insert: Insertable<Database['public']['Tables']['audit_log']['Row'], 'actor_id' | 'action' | 'resource_type'>;
        Update: Partial<Database['public']['Tables']['audit_log']['Row']>;
        Relationships: [];
      };
      family_invites: {
        Row: {
          id: string;
          senior_id: string;
          code: string;
          relationship_type: string | null;
          created_at: string;
          expires_at: string;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: Insertable<Database['public']['Tables']['family_invites']['Row'], 'senior_id' | 'code'>;
        Update: Partial<Database['public']['Tables']['family_invites']['Row']>;
        Relationships: [];
      };
      call_sessions: {
        Row: {
          id: string;
          caller_id: string;
          callee_id: string;
          channel_name: string;
          status: CallStatus;
          escalated_from_sos_event_id: string | null;
          created_at: string;
          started_at: string | null;
          ended_at: string | null;
        };
        Insert: Insertable<Database['public']['Tables']['call_sessions']['Row'], 'caller_id' | 'callee_id' | 'channel_name'>;
        Update: Partial<Database['public']['Tables']['call_sessions']['Row']>;
        Relationships: [];
      };
      product_categories: {
        Row: { id: string; slug: string; name: string; icon: string | null };
        Insert: Insertable<Database['public']['Tables']['product_categories']['Row'], 'slug' | 'name'>;
        Update: Partial<Database['public']['Tables']['product_categories']['Row']>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          category_id: string | null;
          vendor_org_id: string | null;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          is_subscription_eligible: boolean;
          is_active: boolean;
        };
        Insert: Insertable<Database['public']['Tables']['products']['Row'], 'name' | 'price'>;
        Update: Partial<Database['public']['Tables']['products']['Row']>;
        Relationships: [
          { foreignKeyName: 'products_category_id_fkey'; columns: ['category_id']; isOneToOne: false; referencedRelation: 'product_categories'; referencedColumns: ['id'] }
        ];
      };
      service_listings: {
        Row: {
          id: string;
          vendor_org_id: string | null;
          category: string;
          name: string;
          description: string | null;
          price_label: string | null;
          is_active: boolean;
        };
        Insert: Insertable<Database['public']['Tables']['service_listings']['Row'], 'category' | 'name'>;
        Update: Partial<Database['public']['Tables']['service_listings']['Row']>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          belongs_to_user_id: string;
          ordered_by_user_id: string;
          ordered_by_role: OrderedByRole;
          payer_user_id: string;
          status: OrderStatus;
          subtotal: number;
          created_at: string;
        };
        Insert: Insertable<
          Database['public']['Tables']['orders']['Row'],
          'belongs_to_user_id' | 'ordered_by_user_id' | 'ordered_by_role' | 'payer_user_id'
        >;
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
        Relationships: [];
      };
      order_items: {
        Row: { id: string; order_id: string; product_id: string; quantity: number; unit_price: number };
        Insert: Insertable<Database['public']['Tables']['order_items']['Row'], 'order_id' | 'product_id' | 'quantity' | 'unit_price'>;
        Update: Partial<Database['public']['Tables']['order_items']['Row']>;
        Relationships: [
          { foreignKeyName: 'order_items_product_id_fkey'; columns: ['product_id']; isOneToOne: false; referencedRelation: 'products'; referencedColumns: ['id'] }
        ];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          payer_user_id: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          amount: number;
          status: PaymentStatus;
          method: string | null;
          created_at: string;
        };
        Insert: Insertable<Database['public']['Tables']['payments']['Row'], 'order_id' | 'payer_user_id' | 'amount'>;
        Update: Partial<Database['public']['Tables']['payments']['Row']>;
        Relationships: [];
      };
      product_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          frequency_days: number;
          next_order_date: string;
          is_active: boolean;
        };
        Insert: Insertable<Database['public']['Tables']['product_subscriptions']['Row'], 'user_id' | 'product_id'>;
        Update: Partial<Database['public']['Tables']['product_subscriptions']['Row']>;
        Relationships: [
          { foreignKeyName: 'product_subscriptions_product_id_fkey'; columns: ['product_id']; isOneToOne: false; referencedRelation: 'products'; referencedColumns: ['id'] }
        ];
      };
      events: {
        Row: { id: string; title: string; category: string | null; starts_at: string; location_text: string | null };
        Insert: Insertable<Database['public']['Tables']['events']['Row'], 'title' | 'starts_at'>;
        Update: Partial<Database['public']['Tables']['events']['Row']>;
        Relationships: [];
      };
      event_rsvps: {
        Row: { event_id: string; user_id: string; rsvp_at: string };
        Insert: Insertable<Database['public']['Tables']['event_rsvps']['Row'], 'event_id' | 'user_id'>;
        Update: Partial<Database['public']['Tables']['event_rsvps']['Row']>;
        Relationships: [];
      };
      clubs: {
        Row: { id: string; name: string; category: string | null; meeting_schedule: string | null };
        Insert: Insertable<Database['public']['Tables']['clubs']['Row'], 'name'>;
        Update: Partial<Database['public']['Tables']['clubs']['Row']>;
        Relationships: [];
      };
      club_memberships: {
        Row: { club_id: string; user_id: string; joined_at: string };
        Insert: Insertable<Database['public']['Tables']['club_memberships']['Row'], 'club_id' | 'user_id'>;
        Update: Partial<Database['public']['Tables']['club_memberships']['Row']>;
        Relationships: [];
      };
      travel_trips: {
        Row: {
          id: string;
          title: string;
          duration_days: number | null;
          price: number | null;
          accessibility_notes: string | null;
          departs_at: string | null;
        };
        Insert: Insertable<Database['public']['Tables']['travel_trips']['Row'], 'title'>;
        Update: Partial<Database['public']['Tables']['travel_trips']['Row']>;
        Relationships: [];
      };
      trip_bookings: {
        Row: { id: string; trip_id: string; user_id: string; seeking_companion: boolean; booked_at: string };
        Insert: Insertable<Database['public']['Tables']['trip_bookings']['Row'], 'trip_id' | 'user_id'>;
        Update: Partial<Database['public']['Tables']['trip_bookings']['Row']>;
        Relationships: [
          { foreignKeyName: 'trip_bookings_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ];
      };
      accessible_transport_bookings: {
        Row: { id: string; user_id: string; pickup_text: string; scheduled_for: string | null; status: string; created_at: string };
        Insert: Insertable<Database['public']['Tables']['accessible_transport_bookings']['Row'], 'user_id' | 'pickup_text'>;
        Update: Partial<Database['public']['Tables']['accessible_transport_bookings']['Row']>;
        Relationships: [];
      };
      classes: {
        Row: { id: string; title: string; schedule_text: string | null; instructor: string | null };
        Insert: Insertable<Database['public']['Tables']['classes']['Row'], 'title'>;
        Update: Partial<Database['public']['Tables']['classes']['Row']>;
        Relationships: [];
      };
      class_enrollments: {
        Row: { class_id: string; user_id: string; enrolled_at: string };
        Insert: Insertable<Database['public']['Tables']['class_enrollments']['Row'], 'class_id' | 'user_id'>;
        Update: Partial<Database['public']['Tables']['class_enrollments']['Row']>;
        Relationships: [];
      };
      content_items: {
        Row: { id: string; title: string; category: string | null; media_url: string | null; duration_seconds: number | null };
        Insert: Insertable<Database['public']['Tables']['content_items']['Row'], 'title'>;
        Update: Partial<Database['public']['Tables']['content_items']['Row']>;
        Relationships: [];
      };
      watch_progress: {
        Row: { user_id: string; content_id: string; position_seconds: number; updated_at: string };
        Insert: Insertable<Database['public']['Tables']['watch_progress']['Row'], 'user_id' | 'content_id'>;
        Update: Partial<Database['public']['Tables']['watch_progress']['Row']>;
        Relationships: [
          { foreignKeyName: 'watch_progress_content_id_fkey'; columns: ['content_id']; isOneToOne: false; referencedRelation: 'content_items'; referencedColumns: ['id'] }
        ];
      };
      life_story_entries: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          entry_type: string;
          storage_path: string | null;
          body_text: string | null;
          created_at: string;
        };
        Insert: Insertable<Database['public']['Tables']['life_story_entries']['Row'], 'owner_id' | 'title'>;
        Update: Partial<Database['public']['Tables']['life_story_entries']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_permission: {
        Args: { actor: string; owner: string; p_resource_type: PermissionResourceType; p_resource_id?: string | null };
        Returns: boolean;
      };
      get_health_records: { Args: { p_owner_id: string }; Returns: Database['public']['Tables']['health_records']['Row'][] };
      get_vitals: { Args: { p_owner_id: string }; Returns: Database['public']['Tables']['vitals_readings']['Row'][] };
      get_medications: { Args: { p_owner_id: string }; Returns: Database['public']['Tables']['medications']['Row'][] };
      get_insurance_claims: { Args: { p_owner_id: string }; Returns: Database['public']['Tables']['insurance_claims']['Row'][] };
      mark_dose_taken: { Args: { p_dose_log_id: string }; Returns: Database['public']['Tables']['dose_logs']['Row'] };
      ensure_todays_doses: { Args: { p_owner_id: string }; Returns: Database['public']['Tables']['dose_logs']['Row'][] };
      get_dose_logs: { Args: { p_owner_id: string; p_for_date?: string }; Returns: Database['public']['Tables']['dose_logs']['Row'][] };
      create_family_invite: { Args: { p_relationship_type?: string | null }; Returns: Database['public']['Tables']['family_invites']['Row'] };
      // Returns a status object as of the invite-hardening migration, not a
      // bare family_links row — see accept_family_invite() there.
      accept_family_invite: { Args: { p_code: string }; Returns: Json };
      create_order: {
        Args: { p_belongs_to_user_id: string; p_items: Json; p_payer_user_id?: string | null };
        Returns: Database['public']['Tables']['orders']['Row'];
      };
      get_life_story_entries: { Args: { p_owner_id: string }; Returns: Database['public']['Tables']['life_story_entries']['Row'][] };
      // Added by supabase/migrations/20260817120000_security_hardening.sql.
      // Hand-written stopgap: regenerate this whole file with
      // `supabase gen types typescript` against the live project once these
      // migrations are applied there, rather than trusting this by hand
      // longer than necessary.
      set_family_link_status: {
        Args: { p_link_id: string; p_status: FamilyLinkStatus };
        Returns: Database['public']['Tables']['family_links']['Row'];
      };
      book_doctor_slot: {
        Args: {
          p_slot_id: string;
          p_patient_id: string;
          p_booked_by_user_id: string;
          p_mode: BookingMode;
          p_address_text?: string | null;
        };
        Returns: Database['public']['Tables']['doctor_bookings']['Row'];
      };
      set_sos_event_status: {
        Args: { p_sos_event_id: string; p_status: SosStatus };
        Returns: Database['public']['Tables']['sos_events']['Row'];
      };
    };
    Enums: {
      user_role: UserRole;
      org_type: OrgType;
      family_link_status: FamilyLinkStatus;
      permission_resource_type: PermissionResourceType;
      permission_access_level: PermissionAccessLevel;
      booking_mode: BookingMode;
      booking_status: BookingStatus;
      home_care_pricing_type: HomeCarePricingType;
      sos_status: SosStatus;
      call_status: CallStatus;
      ordered_by_role: OrderedByRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
    };
  };
}
