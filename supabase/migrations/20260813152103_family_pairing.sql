-- Family pairing (invite code flow) + the one additional audited-read RPC
-- the family app needs for the medication-adherence view.
--
-- Pairing can't be "family member looks up senior by phone" — profiles RLS
-- deliberately only allows self + already-linked-family reads (0001), so an
-- unlinked family member has no way to find a senior's id directly. A short
-- invite code the senior generates and shares out-of-band (shown on screen,
-- read aloud, sent via WhatsApp — however they'd naturally share it) is the
-- one relationship a stranger can't shortcut into.

create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.profiles (id) on delete cascade,
  code text not null unique,
  relationship_type text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  used_at timestamptz,
  used_by uuid references public.profiles (id)
);

create index family_invites_senior_idx on public.family_invites (senior_id);

create or replace function public.create_family_invite(p_relationship_type text default null)
returns public.family_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_row public.family_invites;
begin
  -- 6-digit numeric code, easy to read aloud/type — collision retried a few
  -- times rather than reaching for something longer up front.
  for i in 1..5 loop
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into family_invites (senior_id, code, relationship_type)
      values (auth.uid(), v_code, p_relationship_type)
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      -- code taken, loop and try another
    end;
  end loop;
  raise exception 'could not generate a unique invite code, try again';
end;
$$;

grant execute on function public.create_family_invite(text) to authenticated;

create or replace function public.accept_family_invite(p_code text)
returns public.family_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.family_invites;
  v_link public.family_links;
begin
  select * into v_invite from family_invites
  where code = p_code and used_at is null and expires_at > now();

  if v_invite.id is null then
    raise exception 'invite code not found or expired';
  end if;

  if v_invite.senior_id = auth.uid() then
    raise exception 'cannot link to yourself';
  end if;

  insert into family_links (senior_id, family_member_id, relationship_type, status)
  values (v_invite.senior_id, auth.uid(), v_invite.relationship_type, 'active')
  on conflict (senior_id, family_member_id) do update set status = 'active'
  returning * into v_link;

  update family_invites set used_at = now(), used_by = auth.uid() where id = v_invite.id;

  return v_link;
end;
$$;

grant execute on function public.accept_family_invite(text) to authenticated;

alter table public.family_invites enable row level security;

-- No select policy for anyone but the issuing senior — a family member
-- resolves a code only through accept_family_invite() above, never by
-- reading the table directly. That RPC runs SECURITY DEFINER so it can see
-- rows RLS would otherwise hide from the accepting family member.
create policy "family_invites_select_own" on public.family_invites for select using (senior_id = auth.uid());

-- Family-side medication adherence view: today's (or a given day's) dose
-- logs for a shared medication, same has_permission() check as the other
-- audited RPCs in 0002.
create or replace function public.get_dose_logs(p_owner_id uuid, p_for_date date default current_date)
returns setof public.dose_logs
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
  return query
    select dl.* from dose_logs dl
    join medications m on m.id = dl.medication_id
    where m.owner_id = p_owner_id
      and dl.scheduled_for >= p_for_date::timestamptz
      and dl.scheduled_for < (p_for_date + 1)::timestamptz
    order by dl.scheduled_for;
end;
$$;

grant execute on function public.get_dose_logs(uuid, date) to authenticated;
