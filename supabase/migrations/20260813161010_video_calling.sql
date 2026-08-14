-- Video calling: call_sessions is the signaling record (who, which Agora
-- channel, what state). The actual media never touches our backend — Agora
-- owns that entirely; we only issue short-lived tokens (see
-- supabase/functions/calls-token) and track status client-reported updates.

create type public.call_status as enum ('ringing', 'active', 'ended', 'missed', 'declined');

create table public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.profiles (id),
  callee_id uuid not null references public.profiles (id),
  channel_name text not null unique,
  status public.call_status not null default 'ringing',
  escalated_from_sos_event_id uuid references public.sos_events (id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  check (caller_id <> callee_id)
);

create index call_sessions_caller_idx on public.call_sessions (caller_id, created_at desc);
create index call_sessions_callee_idx on public.call_sessions (callee_id, created_at desc);

alter table public.call_sessions enable row level security;

-- Both participants can see and update their own call's status (ringing ->
-- active -> ended, or declined). Rows are created by the calls-token Edge
-- Function via service role, not inserted directly by clients — token
-- issuance and session creation are one atomic step there.
create policy "call_sessions_select_participant" on public.call_sessions for select using (
  caller_id = auth.uid() or callee_id = auth.uid()
);

create policy "call_sessions_update_participant" on public.call_sessions for update
  using (caller_id = auth.uid() or callee_id = auth.uid())
  with check (caller_id = auth.uid() or callee_id = auth.uid());

-- doctor_bookings.call_session_id was left unconstrained in 0002 (call_sessions
-- didn't exist yet) — wire the real foreign key now that it does.
alter table public.doctor_bookings
  add constraint doctor_bookings_call_session_id_fkey foreign key (call_session_id) references public.call_sessions (id);
