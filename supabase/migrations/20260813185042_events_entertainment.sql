-- Events/Tour + Entertainment. Most of this is plain public-catalog +
-- self-scoped-RSVP tables (same shape repeated: browsable list, join a
-- policy-simple join/enrollment table). life_story_entries is the one
-- exception — it's shared via permission_grants exactly like health_records,
-- so it gets the same owner-only-RLS + audited-RPC treatment as 0002/0003.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text, -- 'cultural' | 'health_camp' | ...
  starts_at timestamptz not null,
  location_text text
);

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rsvp_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  meeting_schedule text
);

create table public.club_memberships (
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table public.travel_trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  duration_days int,
  price numeric(10, 2),
  accessibility_notes text, -- e.g. 'wheelchair friendly', 'doctor on call'
  departs_at date
);

create table public.trip_bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.travel_trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Companion matching is just "who else on this trip also opted in" — a
  -- live query against this flag, not a persisted match/state-machine table.
  seeking_companion boolean not null default false,
  booked_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create table public.accessible_transport_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pickup_text text not null,
  scheduled_for timestamptz,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  schedule_text text,
  instructor text
);

create table public.class_enrollments (
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

-- Content catalog stays empty until real licensing deals close (see the
-- plan's non-engineering dependencies) — the schema and player wiring are
-- real either way, the UI shows an honest empty state rather than fake rows.
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text, -- 'nostalgia_cinema' | 'devotional_music' | 'audiobook' | 'live_radio'
  media_url text,
  duration_seconds int
);

create table public.watch_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_id uuid not null references public.content_items (id) on delete cascade,
  position_seconds int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

create table public.life_story_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  entry_type text not null default 'audio', -- 'audio' | 'video' | 'text'
  storage_path text,
  body_text text,
  created_at timestamptz not null default now()
);

create index life_story_entries_owner_idx on public.life_story_entries (owner_id, created_at desc);

-- Audited-read RPC — same pattern as get_health_records() in 0002.
create or replace function public.get_life_story_entries(p_owner_id uuid)
returns setof public.life_story_entries
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission(auth.uid(), p_owner_id, 'life_story_entry', null) then
    raise exception 'not authorized';
  end if;
  insert into public.audit_log (actor_id, action, resource_type, owner_id)
  values (auth.uid(), 'read', 'life_story_entry', p_owner_id);
  return query select * from public.life_story_entries where owner_id = p_owner_id order by created_at desc;
end;
$$;

grant execute on function public.get_life_story_entries(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
alter table public.travel_trips enable row level security;
alter table public.trip_bookings enable row level security;
alter table public.accessible_transport_bookings enable row level security;
alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.content_items enable row level security;
alter table public.watch_progress enable row level security;
alter table public.life_story_entries enable row level security;

create policy "events_select_all" on public.events for select using (true);
create policy "clubs_select_all" on public.clubs for select using (true);
create policy "travel_trips_select_all" on public.travel_trips for select using (true);
create policy "classes_select_all" on public.classes for select using (true);
create policy "content_items_select_all" on public.content_items for select using (true);

create policy "event_rsvps_own" on public.event_rsvps for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "club_memberships_own" on public.club_memberships for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "class_enrollments_own" on public.class_enrollments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "watch_progress_own" on public.watch_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "accessible_transport_bookings_own" on public.accessible_transport_bookings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- trip_bookings: the owner manages their own booking; anyone can see WHO on
-- a trip is seeking a companion (not sensitive — it's an opt-in list) without
-- seeing bookings that didn't opt in.
create policy "trip_bookings_select_own_or_seeking" on public.trip_bookings for select using (
  user_id = auth.uid() or seeking_companion
);
create policy "trip_bookings_write_own" on public.trip_bookings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- life_story_entries: owner-only direct access — family reads go through
-- get_life_story_entries() only, same reasoning as health_records in 0002.
create policy "life_story_entries_select_owner" on public.life_story_entries for select using (owner_id = auth.uid());
create policy "life_story_entries_write_owner" on public.life_story_entries for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
