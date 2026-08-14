-- HealthHub vertical + the Emergency SOS pipeline.
--
-- RLS note: health_record / vitals / medication / insurance_claim /
-- insurance_policy are the resource types shared via permission_grants
-- (see 0001). For THESE tables specifically, direct table RLS only allows
-- the owner through — family access to a shared record does not go through
-- table-level RLS at all. Instead it goes through the get_*() RPCs below,
-- which check has_permission() and write an audit_log row in the same
-- transaction. This is deliberate: it keeps "who read this senior's health
-- data, and when" auditable, which plain PostgREST auto-CRUD can't give us.

create type public.booking_mode as enum ('video', 'in_person', 'home_visit');
create type public.booking_status as enum ('booked', 'completed', 'cancelled');
create type public.home_care_pricing_type as enum ('per_visit', 'per_session', 'hourly', 'daily', 'live_in', 'custom');
create type public.sos_status as enum ('triggered', 'acked', 'resolved', 'cancelled');

-- ---------------------------------------------------------------------------
-- Doctors (extends profiles) + availability + bookings
-- ---------------------------------------------------------------------------

create table public.doctor_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  org_id uuid references public.organizations (id),
  specialty text,
  medical_council_reg_no text,
  years_experience int,
  is_verified boolean not null default false,
  bio text
);

create table public.doctor_availability_slots (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctor_profiles (user_id) on delete cascade,
  org_id uuid references public.organizations (id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  mode public.booking_mode not null,
  is_booked boolean not null default false,
  check (end_at > start_at)
);

create index doctor_availability_slots_doctor_idx on public.doctor_availability_slots (doctor_id, start_at);

create table public.doctor_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null unique references public.doctor_availability_slots (id),
  patient_id uuid not null references public.profiles (id),
  booked_by_user_id uuid not null references public.profiles (id),
  mode public.booking_mode not null,
  address_text text, -- home_visit only
  call_session_id uuid, -- fk added once call_sessions exists (video calling task)
  status public.booking_status not null default 'booked',
  created_at timestamptz not null default now()
);

create index doctor_bookings_patient_idx on public.doctor_bookings (patient_id);

-- ---------------------------------------------------------------------------
-- Diagnostics: vitals with threshold-based status flags, + health records vault
-- ---------------------------------------------------------------------------

-- One row per (vital_type, metric). No per-context or per-user overrides in
-- v1 — # ponytail: no rule-authoring DSL/UI, add per-user doctor-set
-- overrides only when a real doctor asks for one.
create table public.threshold_rules (
  vital_type text not null,
  metric text not null, -- 'systolic' | 'diastolic' | 'value'
  unit text,
  normal_min numeric,
  normal_max numeric,
  primary key (vital_type, metric)
);

insert into public.threshold_rules (vital_type, metric, unit, normal_min, normal_max) values
  ('blood_pressure', 'systolic', 'mmHg', 90, 120),
  ('blood_pressure', 'diastolic', 'mmHg', 60, 80),
  ('blood_sugar', 'value', 'mg/dL', 70, 140),
  ('spo2', 'value', '%', 95, 100);

create or replace function public.compute_vital_status(p_vital_type text, p_values jsonb)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_metric text;
  v_value numeric;
  v_rule record;
begin
  for v_metric in select jsonb_object_keys(p_values) loop
    v_value := (p_values ->> v_metric)::numeric;
    select * into v_rule from threshold_rules where vital_type = p_vital_type and metric = v_metric;
    if v_rule is null then
      continue;
    end if;
    if v_value < v_rule.normal_min then
      return 'low';
    elsif v_value > v_rule.normal_max then
      return 'high';
    end if;
  end loop;
  return 'normal';
end;
$$;

create table public.vitals_readings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  recorded_by uuid not null references public.profiles (id),
  vital_type text not null, -- 'blood_pressure' | 'blood_sugar' | 'spo2'
  reading_context text,
  reading_values jsonb not null, -- {"systolic":128,"diastolic":82} | {"value":142} | {"value":97}
  status text,
  recorded_at timestamptz not null default now()
);

create index vitals_readings_owner_idx on public.vitals_readings (owner_id, recorded_at desc);

create or replace function public.set_vital_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.status := public.compute_vital_status(new.vital_type, new.reading_values);
  return new;
end;
$$;

create trigger vitals_readings_set_status
  before insert on public.vitals_readings
  for each row execute function public.set_vital_status();

create table public.health_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  record_type text not null, -- 'blood_test' | 'ecg' | 'prescription' | ...
  storage_path text not null,
  doctor_booking_id uuid references public.doctor_bookings (id),
  created_at timestamptz not null default now()
);

create index health_records_owner_idx on public.health_records (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Medications + daily dose adherence
-- ---------------------------------------------------------------------------

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  prescribed_by uuid references public.profiles (id),
  name text not null,
  dosage text,
  schedule jsonb not null, -- [{"time":"08:00","relation":"after_breakfast"}, ...]
  doses_remaining int,
  refill_threshold int not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications (id) on delete cascade,
  scheduled_for timestamptz not null,
  taken_at timestamptz,
  status text not null default 'pending', -- 'pending' | 'taken' | 'missed'
  unique (medication_id, scheduled_for)
);

create index dose_logs_medication_idx on public.dose_logs (medication_id, scheduled_for);

-- ---------------------------------------------------------------------------
-- Home healthcare, wellness, insurance
-- ---------------------------------------------------------------------------

create table public.home_healthcare_bookings (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.profiles (id) on delete cascade,
  provider_org_id uuid references public.organizations (id),
  service_name text not null, -- 'nursing_care' | 'physiotherapy' | 'caregiver' | 'palliative_care'
  pricing_type public.home_care_pricing_type not null,
  quoted_amount numeric(10, 2),
  status text not null default 'requested',
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

create table public.wellness_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  stream_url text,
  created_at timestamptz not null default now()
);

create table public.wellness_session_enrollments (
  session_id uuid not null references public.wellness_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (session_id, user_id)
);

create table public.wellness_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_weeks int
);

create table public.wellness_program_enrollments (
  program_id uuid not null references public.wellness_programs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (program_id, user_id)
);

create table public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  provider_org_id uuid references public.organizations (id),
  policy_number text not null,
  cover_amount numeric(12, 2),
  valid_till date,
  created_at timestamptz not null default now()
);

create table public.insurance_claims (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.insurance_policies (id) on delete cascade,
  owner_id uuid not null references public.profiles (id),
  claim_type text,
  status text not null default 'filed',
  filed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Emergency contacts + the SOS pipeline
-- ---------------------------------------------------------------------------

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.profiles (id) on delete cascade,
  family_link_id uuid references public.family_links (id),
  contact_type text not null, -- 'family' | 'physician'
  display_name text,
  phone text,
  is_primary boolean not null default false
);

create table public.sos_events (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.profiles (id),
  status public.sos_status not null default 'triggered',
  latitude double precision,
  longitude double precision,
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index sos_events_senior_idx on public.sos_events (senior_id, triggered_at desc);

-- One row per (recipient, channel, attempt) — this doubles as delivery
-- tracking for the escalation cron AND the audit trail for the SOS flow.
-- Don't also write these events into audit_log; that table is reserved for
-- sensitive-record *read* auditing, a separate concern.
create table public.sos_notifications (
  id uuid primary key default gen_random_uuid(),
  sos_event_id uuid not null references public.sos_events (id) on delete cascade,
  recipient_id uuid references public.profiles (id), -- null = generic care-team channel
  channel text not null, -- 'push' | 'sms' | 'whatsapp'
  attempt int not null default 1,
  sent_at timestamptz not null default now(),
  acked_at timestamptz,
  status text not null default 'sent'
);

create index sos_notifications_event_idx on public.sos_notifications (sos_event_id);

-- No confirmed ambulance/dispatch-partner API as of this build — this stays
-- an internal ops-managed record until a real partner integration exists.
create table public.care_dispatch (
  id uuid primary key default gen_random_uuid(),
  sos_event_id uuid not null references public.sos_events (id) on delete cascade,
  partner_org_id uuid references public.organizations (id),
  eta_minutes int,
  dispatch_status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Cross-cutting: push tokens, generic notifications, sensitive-read audit log
-- ---------------------------------------------------------------------------

create table public.push_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text not null default 'android',
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id),
  action text not null, -- 'read' | 'write'
  resource_type text not null,
  resource_id uuid,
  owner_id uuid,
  accessed_at timestamptz not null default now()
);

create index audit_log_owner_idx on public.audit_log (owner_id, accessed_at desc);

-- ---------------------------------------------------------------------------
-- Audited-read RPCs for the resource types shared via permission_grants.
-- These are the ONLY sanctioned way for a family member to read a senior's
-- shared health data — see the RLS section below for why.
-- ---------------------------------------------------------------------------

create or replace function public.get_health_records(p_owner_id uuid)
returns setof public.health_records
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission(auth.uid(), p_owner_id, 'health_record', null) then
    raise exception 'not authorized';
  end if;
  insert into public.audit_log (actor_id, action, resource_type, owner_id)
  values (auth.uid(), 'read', 'health_record', p_owner_id);
  return query select * from public.health_records where owner_id = p_owner_id order by created_at desc;
end;
$$;

create or replace function public.get_vitals(p_owner_id uuid)
returns setof public.vitals_readings
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission(auth.uid(), p_owner_id, 'vitals', null) then
    raise exception 'not authorized';
  end if;
  insert into public.audit_log (actor_id, action, resource_type, owner_id)
  values (auth.uid(), 'read', 'vitals', p_owner_id);
  return query select * from public.vitals_readings where owner_id = p_owner_id order by recorded_at desc;
end;
$$;

create or replace function public.get_medications(p_owner_id uuid)
returns setof public.medications
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission(auth.uid(), p_owner_id, 'medication', null) then
    raise exception 'not authorized';
  end if;
  insert into public.audit_log (actor_id, action, resource_type, owner_id)
  values (auth.uid(), 'read', 'medication', p_owner_id);
  return query select * from public.medications where owner_id = p_owner_id and is_active order by created_at;
end;
$$;

create or replace function public.get_insurance_claims(p_owner_id uuid)
returns setof public.insurance_claims
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission(auth.uid(), p_owner_id, 'insurance_claim', null) then
    raise exception 'not authorized';
  end if;
  insert into public.audit_log (actor_id, action, resource_type, owner_id)
  values (auth.uid(), 'read', 'insurance_claim', p_owner_id);
  return query select * from public.insurance_claims where owner_id = p_owner_id order by filed_at desc;
end;
$$;

grant execute on function public.get_health_records(uuid) to authenticated;
grant execute on function public.get_vitals(uuid) to authenticated;
grant execute on function public.get_medications(uuid) to authenticated;
grant execute on function public.get_insurance_claims(uuid) to authenticated;

-- Mark a dose taken. A thin RPC (rather than a raw update policy) so the
-- "is this actually today's/owner's dose" check lives in one place.
create or replace function public.mark_dose_taken(p_dose_log_id uuid)
returns public.dose_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.dose_logs;
begin
  select dl.* into v_row
  from public.dose_logs dl
  join public.medications m on m.id = dl.medication_id
  where dl.id = p_dose_log_id and m.owner_id = auth.uid();

  if v_row.id is null then
    raise exception 'not authorized';
  end if;

  update public.dose_logs
  set taken_at = now(), status = 'taken'
  where id = p_dose_log_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.mark_dose_taken(uuid) to authenticated;

-- Materializes today's dose_logs from each active medication's schedule, on
-- demand, idempotently (the unique (medication_id, scheduled_for) constraint
-- makes the ON CONFLICT a no-op on repeat calls). Called when the senior
-- opens the Medication screen.
-- # ponytail: on-demand materialization only for v1 — add a scheduled Edge
-- Function to pre-materialize + fire reminder pushes once notifications are wired up.
create or replace function public.ensure_todays_doses(p_owner_id uuid)
returns setof public.dose_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_med record;
  v_slot jsonb;
  v_time time;
  v_scheduled_for timestamptz;
begin
  if auth.uid() <> p_owner_id then
    raise exception 'not authorized';
  end if;

  for v_med in select * from medications where owner_id = p_owner_id and is_active loop
    for v_slot in select * from jsonb_array_elements(v_med.schedule) loop
      v_time := (v_slot ->> 'time')::time;
      v_scheduled_for := (current_date + v_time)::timestamptz;
      insert into dose_logs (medication_id, scheduled_for)
      values (v_med.id, v_scheduled_for)
      on conflict (medication_id, scheduled_for) do nothing;
    end loop;
  end loop;

  return query
    select dl.* from dose_logs dl
    join medications m on m.id = dl.medication_id
    where m.owner_id = p_owner_id and dl.scheduled_for >= date_trunc('day', now())
    order by dl.scheduled_for;
end;
$$;

grant execute on function public.ensure_todays_doses(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.doctor_profiles enable row level security;
alter table public.doctor_availability_slots enable row level security;
alter table public.doctor_bookings enable row level security;
alter table public.threshold_rules enable row level security;
alter table public.vitals_readings enable row level security;
alter table public.health_records enable row level security;
alter table public.medications enable row level security;
alter table public.dose_logs enable row level security;
alter table public.home_healthcare_bookings enable row level security;
alter table public.wellness_sessions enable row level security;
alter table public.wellness_session_enrollments enable row level security;
alter table public.wellness_programs enable row level security;
alter table public.wellness_program_enrollments enable row level security;
alter table public.insurance_policies enable row level security;
alter table public.insurance_claims enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.sos_events enable row level security;
alter table public.sos_notifications enable row level security;
alter table public.care_dispatch enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- Public directories (browsable, not sensitive)
create policy "threshold_rules_select_all" on public.threshold_rules for select using (true);
create policy "doctor_profiles_select_all" on public.doctor_profiles for select using (true);
create policy "doctor_profiles_update_self" on public.doctor_profiles for update using (user_id = auth.uid());
create policy "doctor_availability_slots_select_all" on public.doctor_availability_slots for select using (true);
create policy "wellness_sessions_select_all" on public.wellness_sessions for select using (true);
create policy "wellness_programs_select_all" on public.wellness_programs for select using (true);

-- Owner-only direct access (family access to these goes through the
-- audited RPCs above, not through table-level RLS)
create policy "vitals_readings_select_owner" on public.vitals_readings for select using (owner_id = auth.uid());
create policy "vitals_readings_insert_owner" on public.vitals_readings for insert with check (recorded_by = auth.uid());

create policy "health_records_select_owner" on public.health_records for select using (owner_id = auth.uid());
create policy "health_records_insert_uploader" on public.health_records for insert with check (uploaded_by = auth.uid());

create policy "medications_select_owner" on public.medications for select using (owner_id = auth.uid());
create policy "medications_write_owner" on public.medications for all
  using (owner_id = auth.uid() or prescribed_by = auth.uid())
  with check (owner_id = auth.uid() or prescribed_by = auth.uid());

create policy "dose_logs_select_owner" on public.dose_logs for select using (
  exists (select 1 from public.medications m where m.id = dose_logs.medication_id and m.owner_id = auth.uid())
);

create policy "insurance_policies_select_owner" on public.insurance_policies for select using (owner_id = auth.uid());
create policy "insurance_claims_select_owner" on public.insurance_claims for select using (owner_id = auth.uid());

-- Bookings: participant-visible (patient, whoever booked it, or the doctor)
create policy "doctor_bookings_select_participant" on public.doctor_bookings for select using (
  patient_id = auth.uid()
  or booked_by_user_id = auth.uid()
  or exists (
    select 1 from public.doctor_availability_slots das
    where das.id = doctor_bookings.slot_id and das.doctor_id = auth.uid()
  )
);
create policy "doctor_bookings_insert_booker" on public.doctor_bookings for insert with check (booked_by_user_id = auth.uid());

create policy "home_healthcare_bookings_select_owner" on public.home_healthcare_bookings for select using (senior_id = auth.uid());
create policy "home_healthcare_bookings_insert_owner" on public.home_healthcare_bookings for insert with check (senior_id = auth.uid());

create policy "wellness_session_enrollments_own" on public.wellness_session_enrollments for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "wellness_program_enrollments_own" on public.wellness_program_enrollments for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Emergency contacts: the senior manages their own list
create policy "emergency_contacts_owner_all" on public.emergency_contacts for all
  using (senior_id = auth.uid()) with check (senior_id = auth.uid());

-- SOS: the senior + any actively-linked family member can see it (a
-- family_link alone grants SOS visibility, per 0001's design). Writes to
-- sos_events/sos_notifications/care_dispatch happen via the service role
-- from the sos-trigger/sos-escalate Edge Functions, not directly by clients.
create policy "sos_events_select_senior_or_family" on public.sos_events for select using (
  senior_id = auth.uid()
  or exists (
    select 1 from public.family_links fl
    where fl.senior_id = sos_events.senior_id and fl.family_member_id = auth.uid() and fl.status = 'active'
  )
);

create policy "sos_notifications_select_participant" on public.sos_notifications for select using (
  recipient_id = auth.uid()
  or exists (select 1 from public.sos_events se where se.id = sos_notifications.sos_event_id and se.senior_id = auth.uid())
);
create policy "sos_notifications_ack_own" on public.sos_notifications for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy "care_dispatch_select_senior_or_family" on public.care_dispatch for select using (
  exists (
    select 1 from public.sos_events se
    where se.id = care_dispatch.sos_event_id
      and (se.senior_id = auth.uid() or exists (
        select 1 from public.family_links fl
        where fl.senior_id = se.senior_id and fl.family_member_id = auth.uid() and fl.status = 'active'
      ))
  )
);

-- Self-only
create policy "push_tokens_own" on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_own" on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_log: readable by the senior it's about (so they can see who viewed
-- their data) and by the actor who did the reading. No insert policy here
-- on purpose — writes only happen via the SECURITY DEFINER RPCs above.
create policy "audit_log_select_owner_or_actor" on public.audit_log for select using (
  owner_id = auth.uid() or actor_id = auth.uid()
);
