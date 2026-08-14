-- Sukyoo core schema: identity, partner orgs, and the family permission
-- (RBAC) layer that every later vertical's RLS policies build on.

-- gen_random_uuid() is built into Postgres core since v13; no extension needed.

create type public.user_role as enum (
  'senior', 'family', 'doctor', 'vendor', 'ops_agent', 'care_team', 'admin'
);

create type public.org_type as enum (
  'hospital', 'clinic', 'lab', 'vendor', 'insurer', 'ngo', 'home_healthcare_provider'
);

create type public.family_link_status as enum ('pending', 'active', 'revoked');

-- One enum value per shareable resource type. Add a value here (and nowhere
-- else) when a new vertical introduces something a senior can share with family.
create type public.permission_resource_type as enum (
  'health_record', 'vitals', 'medication', 'insurance_claim', 'insurance_policy',
  'order', 'life_story_entry'
);

create type public.permission_access_level as enum ('view', 'manage');

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'senior',
  full_name text,
  phone text unique,
  date_of_birth date,
  pincode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row the moment someone signs up, keyed off metadata
-- passed to signUp/signInWithOtp (role, full_name). Without this, a fresh
-- auth.users row would have nothing for the rest of the schema to reference.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'senior'),
    new.raw_user_meta_data ->> 'full_name',
    new.phone
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Partner organizations (hospitals, clinics, labs, vendors, insurers, ...)
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  type public.org_type not null,
  name text not null,
  kyc_status text not null default 'pending',
  default_commission_rate numeric(5, 2) not null default 0,
  payout_details jsonb,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index org_members_user_idx on public.org_members (user_id);

-- ---------------------------------------------------------------------------
-- Family links + permission grants: the RBAC core of the whole product.
-- A family_link by itself grants NO record access — it only means "these two
-- accounts are connected" (enough for SOS visibility). Actual access to any
-- resource requires an explicit, revocable permission_grants row created by
-- the senior. This split is deliberate: consent must be explicit, not implied
-- by the relationship existing.
-- ---------------------------------------------------------------------------

create table public.family_links (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.profiles (id) on delete cascade,
  family_member_id uuid not null references public.profiles (id) on delete cascade,
  relationship_type text,
  status public.family_link_status not null default 'pending',
  is_primary_contact boolean not null default false,
  created_at timestamptz not null default now(),
  unique (senior_id, family_member_id),
  check (senior_id <> family_member_id)
);

create index family_links_senior_idx on public.family_links (senior_id);
create index family_links_family_member_idx on public.family_links (family_member_id);

create table public.permission_grants (
  id uuid primary key default gen_random_uuid(),
  family_link_id uuid not null references public.family_links (id) on delete cascade,
  resource_type public.permission_resource_type not null,
  resource_id uuid, -- null = every record of this type, not just one
  access_level public.permission_access_level not null default 'view',
  granted_at timestamptz not null default now(),
  revoked_at timestamptz -- soft-revoke only: never delete a grant, it's a consent record
);

create index permission_grants_family_link_idx on public.permission_grants (family_link_id);

-- The one function every sensitive table's RLS policy calls. Owners always
-- pass; everyone else needs an active, non-revoked grant that matches the
-- resource type and (if the grant is record-specific) the resource id.
create or replace function public.has_permission(
  actor uuid,
  owner uuid,
  p_resource_type public.permission_resource_type,
  p_resource_id uuid default null
) returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select actor = owner
    or exists (
      select 1
      from public.permission_grants pg
      join public.family_links fl on fl.id = pg.family_link_id
      where fl.senior_id = owner
        and fl.family_member_id = actor
        and fl.status = 'active'
        and pg.resource_type = p_resource_type
        and pg.revoked_at is null
        and (pg.resource_id is null or pg.resource_id = p_resource_id)
    );
$$;

grant execute on function public.has_permission(uuid, uuid, public.permission_resource_type, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.family_links enable row level security;
alter table public.permission_grants enable row level security;

create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_linked_family" on public.profiles
  for select using (
    exists (
      select 1 from public.family_links fl
      where fl.status = 'active'
        and ((fl.senior_id = auth.uid() and fl.family_member_id = profiles.id)
          or (fl.family_member_id = auth.uid() and fl.senior_id = profiles.id))
    )
  );

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

create policy "organizations_select_verified" on public.organizations
  for select using (is_verified = true);

create policy "organizations_select_member" on public.organizations
  for select using (
    exists (select 1 from public.org_members om where om.org_id = organizations.id and om.user_id = auth.uid())
  );

create policy "org_members_select_own_org" on public.org_members
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.org_members me where me.org_id = org_members.org_id and me.user_id = auth.uid())
  );

create policy "family_links_select_participant" on public.family_links
  for select using (senior_id = auth.uid() or family_member_id = auth.uid());

create policy "family_links_insert_participant" on public.family_links
  for insert with check (senior_id = auth.uid() or family_member_id = auth.uid());

create policy "family_links_update_participant" on public.family_links
  for update using (senior_id = auth.uid() or family_member_id = auth.uid());

-- Both sides of a link can see what's been granted about them, but only the
-- senior (the owner of the underlying records) can create/revoke a grant.
create policy "permission_grants_select_participant" on public.permission_grants
  for select using (
    exists (
      select 1 from public.family_links fl
      where fl.id = permission_grants.family_link_id
        and (fl.senior_id = auth.uid() or fl.family_member_id = auth.uid())
    )
  );

create policy "permission_grants_write_senior_only" on public.permission_grants
  for all using (
    exists (
      select 1 from public.family_links fl
      where fl.id = permission_grants.family_link_id and fl.senior_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.family_links fl
      where fl.id = permission_grants.family_link_id and fl.senior_id = auth.uid()
    )
  );
