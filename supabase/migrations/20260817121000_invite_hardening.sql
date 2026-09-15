-- Hardens the invite-code pairing flow (AUDIT_2026-08.md §4.13): plaintext
-- 6-digit numeric codes from non-cryptographic random(), a 24h TTL, no rate
-- limit, no attempt counter — brute-forceable across the whole 10^6 code
-- space. Fixes: crypto-random 8-char codes, a 15-minute TTL, and an
-- attempt-log table backing both a per-caller guess rate limit and a
-- per-senior mint rate limit.

alter table public.family_invites
  alter column expires_at set default (now() + interval '15 minutes');

-- One row per accept_family_invite() call, successful or not — this is what
-- the rate limit below is computed from. No client reads or writes this
-- directly; only the SECURITY DEFINER RPC does.
create table public.invite_accept_attempts (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index invite_accept_attempts_actor_idx on public.invite_accept_attempts (actor_id, attempted_at desc);

alter table public.invite_accept_attempts enable row level security;
-- No policies at all: SECURITY DEFINER RPC writes it, nobody reads it directly.

create or replace function public.create_family_invite(p_relationship_type text default null)
returns public.family_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_row public.family_invites;
  v_recent_count int;
begin
  select count(*) into v_recent_count
  from public.family_invites
  where senior_id = auth.uid() and created_at > now() - interval '1 hour';

  if v_recent_count >= 5 then
    raise exception 'too many invite codes requested, try again later';
  end if;

  -- 8 hex characters from gen_random_uuid() — 32 bits of cryptographically
  -- strong entropy (Postgres's own docs guarantee gen_random_uuid()'s RNG),
  -- reusing a function already used throughout this schema rather than
  -- adding pgcrypto for a dedicated random-bytes call.
  for i in 1..5 loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
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

revoke execute on function public.create_family_invite(text) from public;
grant execute on function public.create_family_invite(text) to authenticated;

-- accept_family_invite() must be dropped and recreated, not CREATE OR
-- REPLACE: its return type changes from a family_links row to jsonb, and
-- CREATE OR REPLACE FUNCTION cannot change a function's return type — this
-- would fail outright applied to a live database. The attempt-log insert
-- also must happen before any early return: raising on an expected user
-- error aborts the transaction and rolls back the very attempt row meant to
-- be counted. Both traps are documented in AUDIT_2026-08.md's own account of
-- the first two bugs its (now also lost) test harness caught.
drop function if exists public.accept_family_invite(text);

create function public.accept_family_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.family_invites;
  v_link public.family_links;
  v_recent_attempts int;
begin
  insert into public.invite_accept_attempts (actor_id) values (auth.uid());

  select count(*) into v_recent_attempts
  from public.invite_accept_attempts
  where actor_id = auth.uid() and attempted_at > now() - interval '15 minutes';

  if v_recent_attempts > 10 then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  select * into v_invite from family_invites
  where code = p_code and used_at is null and expires_at > now();

  if v_invite.id is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_invite.senior_id = auth.uid() then
    return jsonb_build_object('status', 'self');
  end if;

  insert into family_links (senior_id, family_member_id, relationship_type, status)
  values (v_invite.senior_id, auth.uid(), v_invite.relationship_type, 'active')
  on conflict (senior_id, family_member_id) do update set status = 'active'
  returning * into v_link;

  update family_invites set used_at = now(), used_by = auth.uid() where id = v_invite.id;

  return jsonb_build_object('status', 'ok', 'link', to_jsonb(v_link));
end;
$$;

revoke execute on function public.accept_family_invite(text) from public;
grant execute on function public.accept_family_invite(text) to authenticated;
