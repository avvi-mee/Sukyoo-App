-- Security hardening. Re-implements every CRITICAL/HIGH finding in
-- AUDIT_2026-08.md §4 — those fixes were made once already (2026-08-17,
-- per that document) directly in a working tree that was later deleted
-- without ever being committed. This migration reconstructs them from the
-- audit's own description of each bug, verified against the actual SQL in
-- the 7 migrations that follow it.

-- ---------------------------------------------------------------------------
-- 1. Self-service admin (AUDIT §4.1). handle_new_user() trusted
-- raw_user_meta_data.role verbatim, and signUpWithEmail()/sendOtp() both let
-- the client set that field — anyone could sign up as 'admin' or
-- 'ops_agent'. Self-service can only ever create 'senior' or 'family'; every
-- other role needs a provisioning path that doesn't exist yet in this
-- codebase.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := case
    when (new.raw_user_meta_data ->> 'role') = 'family' then 'family'::public.user_role
    else 'senior'::public.user_role
  end;
begin
  insert into public.profiles (id, role, full_name, phone)
  values (new.id, v_role, new.raw_user_meta_data ->> 'full_name', new.phone);
  return new;
end;
$$;

-- profiles_update_self (0001) has no column restriction, so the same
-- escalation is reachable post-signup via a plain UPDATE. Lock the role
-- column specifically; every other self-editable column is unaffected.
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() = old.id then
    raise exception 'cannot change your own role';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_role_change
  before update on public.profiles
  for each row execute function public.prevent_self_role_change();

-- ---------------------------------------------------------------------------
-- 2. Forged family links (AUDIT §4.2). family_links_insert_participant let a
-- family member name a STRANGER as senior_id; family_links_update_participant
-- then let them flip it to 'active' unilaterally — full read access to that
-- stranger's profile PII and SOS location history, with zero involvement
-- from the actual senior. Close direct writes entirely: a link can only be
-- created via accept_family_invite() (SECURITY DEFINER, unaffected by
-- dropping these policies) and can only be revoked, never self-activated,
-- via set_family_link_status() below.
-- ---------------------------------------------------------------------------

drop policy if exists "family_links_insert_participant" on public.family_links;
drop policy if exists "family_links_update_participant" on public.family_links;

create or replace function public.set_family_link_status(p_link_id uuid, p_status public.family_link_status)
returns public.family_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.family_links;
begin
  select * into v_link from public.family_links
  where id = p_link_id and (senior_id = auth.uid() or family_member_id = auth.uid());

  if v_link.id is null then
    raise exception 'not authorized';
  end if;

  -- Re-activating a link is accept_family_invite()'s job — it requires the
  -- senior's own invite code, which this RPC deliberately does not accept.
  if p_status <> 'revoked' then
    raise exception 'only revoking a link is allowed here';
  end if;

  update public.family_links set status = 'revoked' where id = p_link_id returning * into v_link;

  -- Revoking the relationship revokes every consent granted under it in the
  -- same transaction — an active link with no matching grants is a state
  -- has_permission() and the audited get_*() RPCs never expect.
  update public.permission_grants
  set revoked_at = now()
  where family_link_id = p_link_id and revoked_at is null;

  return v_link;
end;
$$;

revoke execute on function public.set_family_link_status(uuid, public.family_link_status) from public;
grant execute on function public.set_family_link_status(uuid, public.family_link_status) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Fabricated health data (AUDIT §4.3). Three INSERT policies checked the
-- ACTOR column instead of the OWNER column, so any authenticated user could
-- write fake vitals, upload a fake record, or add an active medication into
-- an arbitrary stranger's record — including one ensure_todays_doses() would
-- surface in the victim's own daily reminder list.
-- ---------------------------------------------------------------------------

drop policy if exists "vitals_readings_insert_owner" on public.vitals_readings;
create policy "vitals_readings_insert_owner" on public.vitals_readings
  for insert with check (owner_id = auth.uid() and recorded_by = auth.uid());

drop policy if exists "health_records_insert_uploader" on public.health_records;
create policy "health_records_insert_uploader" on public.health_records
  for insert with check (owner_id = auth.uid() and uploaded_by = auth.uid());

-- The dropped policy's "prescribed_by = auth.uid()" branch let anyone write
-- an active medication into a stranger's list merely by naming themselves as
-- prescribed_by. No verified-doctor-prescribing path exists anywhere in the
-- app that relies on it (useAddMedication never sets prescribed_by).
drop policy if exists "medications_write_owner" on public.medications;
create policy "medications_write_owner" on public.medications for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Doctor self-verification (AUDIT §4.9). doctor_profiles_update_self had
-- no column restriction, so a doctor could set their own is_verified — the
-- only gate on being bookable for telemedicine.
-- ---------------------------------------------------------------------------

create or replace function public.prevent_self_verification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_verified is distinct from old.is_verified and auth.uid() = old.user_id then
    raise exception 'a doctor cannot verify themselves';
  end if;
  return new;
end;
$$;

create trigger doctor_profiles_prevent_self_verification
  before update on public.doctor_profiles
  for each row execute function public.prevent_self_verification();

-- ---------------------------------------------------------------------------
-- 5. Silent double-booking (AUDIT §4.11). doctor_availability_slots had no
-- UPDATE policy, so the client's insert-then-update({is_booked:true}) two
-- step affected 0 rows on the update half and returned no error — the slot
-- stayed "available" forever, so every subsequent booking attempt against it
-- failed confusingly rather than being told the slot was taken. Replace the
-- two-step with one atomic, row-locking RPC.
-- ---------------------------------------------------------------------------

create or replace function public.book_doctor_slot(
  p_slot_id uuid,
  p_patient_id uuid,
  p_booked_by_user_id uuid,
  p_mode public.booking_mode,
  p_address_text text default null
) returns public.doctor_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.doctor_availability_slots;
  v_booking public.doctor_bookings;
begin
  if auth.uid() <> p_booked_by_user_id then
    raise exception 'not authorized';
  end if;

  select * into v_slot from public.doctor_availability_slots where id = p_slot_id for update;

  if v_slot.id is null then
    raise exception 'slot not found';
  end if;
  if v_slot.is_booked then
    raise exception 'slot already booked';
  end if;
  if not exists (select 1 from public.doctor_profiles dp where dp.user_id = v_slot.doctor_id and dp.is_verified) then
    raise exception 'doctor is not verified';
  end if;

  insert into public.doctor_bookings (slot_id, patient_id, booked_by_user_id, mode, address_text)
  values (p_slot_id, p_patient_id, p_booked_by_user_id, p_mode, p_address_text)
  returning * into v_booking;

  update public.doctor_availability_slots set is_booked = true where id = p_slot_id;

  return v_booking;
end;
$$;

revoke execute on function public.book_doctor_slot(uuid, uuid, uuid, public.booking_mode, text) from public;
grant execute on function public.book_doctor_slot(uuid, uuid, uuid, public.booking_mode, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Stuck SOS events (AUDIT §4.10). sos_events had no UPDATE policy at all,
-- so acked/resolved/cancelled were unreachable from any client — every event
-- stayed 'triggered' forever, and sos-escalate treated every past event as
-- still open. An explicit transition state machine, not a blanket policy
-- (repeating the family_links mistake of "using" with no "with check" is
-- exactly what created finding #2 above).
-- ---------------------------------------------------------------------------

create or replace function public.set_sos_event_status(p_sos_event_id uuid, p_status public.sos_status)
returns public.sos_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.sos_events;
  v_is_participant boolean;
begin
  select * into v_event from public.sos_events where id = p_sos_event_id;
  if v_event.id is null then
    raise exception 'sos event not found';
  end if;

  v_is_participant := v_event.senior_id = auth.uid() or exists (
    select 1 from public.family_links fl
    where fl.senior_id = v_event.senior_id and fl.family_member_id = auth.uid() and fl.status = 'active'
  );
  if not v_is_participant then
    raise exception 'not authorized';
  end if;

  if not (
    (v_event.status = 'triggered' and p_status in ('acked', 'cancelled'))
    or (v_event.status = 'acked' and p_status in ('resolved', 'cancelled'))
  ) then
    raise exception 'invalid status transition: % -> %', v_event.status, p_status;
  end if;

  update public.sos_events
  set status = p_status,
      resolved_at = case when p_status in ('resolved', 'cancelled') then now() else resolved_at end
  where id = p_sos_event_id
  returning * into v_event;

  return v_event;
end;
$$;

revoke execute on function public.set_sos_event_status(uuid, public.sos_status) from public;
grant execute on function public.set_sos_event_status(uuid, public.sos_status) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Payer visibility + view-only consent authorizing spending (AUDIT §4,
-- "orders_select_participant omitted payer_user_id" / "access_level was
-- never read anywhere ... view-only consent authorized spending").
-- ---------------------------------------------------------------------------

drop policy if exists "orders_select_participant" on public.orders;
create policy "orders_select_participant" on public.orders for select using (
  belongs_to_user_id = auth.uid() or ordered_by_user_id = auth.uid() or payer_user_id = auth.uid()
);

create or replace function public.create_order(
  p_belongs_to_user_id uuid,
  p_items jsonb,
  p_payer_user_id uuid default null
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.ordered_by_role;
  v_order public.orders;
  v_item jsonb;
  v_product public.products;
  v_subtotal numeric(10, 2) := 0;
  v_has_manage_grant boolean;
begin
  if auth.uid() = p_belongs_to_user_id then
    v_role := 'self';
  elsif exists (select 1 from profiles where id = auth.uid() and role = 'ops_agent') then
    v_role := 'ops_agent';
  else
    -- has_permission() doesn't distinguish access_level, so check it
    -- directly here rather than widen that shared function's contract for
    -- every other caller — a 'view' grant on 'order' authorizes seeing
    -- order history, not spending.
    select exists (
      select 1
      from public.permission_grants pg
      join public.family_links fl on fl.id = pg.family_link_id
      where fl.senior_id = p_belongs_to_user_id
        and fl.family_member_id = auth.uid()
        and fl.status = 'active'
        and pg.resource_type = 'order'
        and pg.revoked_at is null
        and pg.access_level = 'manage'
    ) into v_has_manage_grant;

    if v_has_manage_grant then
      v_role := 'family';
    else
      raise exception 'not authorized';
    end if;
  end if;

  insert into orders (belongs_to_user_id, ordered_by_user_id, ordered_by_role, payer_user_id)
  values (p_belongs_to_user_id, auth.uid(), v_role, coalesce(p_payer_user_id, auth.uid()))
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products where id = (v_item ->> 'product_id')::uuid and is_active;
    if v_product.id is null then
      raise exception 'product not found or inactive';
    end if;

    insert into order_items (order_id, product_id, quantity, unit_price)
    values (v_order.id, v_product.id, (v_item ->> 'quantity')::int, v_product.price);

    v_subtotal := v_subtotal + v_product.price * (v_item ->> 'quantity')::int;
  end loop;

  update orders set subtotal = v_subtotal where id = v_order.id returning * into v_order;
  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Duplicate live grants (AUDIT §4.16). Toggling a permission on/off/on
-- left duplicate active rows. resource_id is nullable and a plain unique
-- index treats every NULL as distinct, so the common "grant every record of
-- this type" case (resource_id IS NULL) needs an expression index to
-- actually be covered.
-- ---------------------------------------------------------------------------

create unique index if not exists permission_grants_active_unique
  on public.permission_grants (
    family_link_id,
    resource_type,
    coalesce(resource_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where revoked_at is null;

-- ---------------------------------------------------------------------------
-- 9. Anonymously-callable consent oracle (AUDIT §4.14). Postgres grants
-- EXECUTE to PUBLIC on every new function by default; the existing `grant
-- ... to authenticated` statements never revoked that default, so
-- has_permission() and every audited get_*() RPC were callable by anyone,
-- authenticated or not. accept_family_invite() is handled in the next
-- migration, where its signature changes.
-- ---------------------------------------------------------------------------

revoke execute on function public.has_permission(uuid, uuid, public.permission_resource_type, uuid) from public;
revoke execute on function public.get_health_records(uuid) from public;
revoke execute on function public.get_vitals(uuid) from public;
revoke execute on function public.get_medications(uuid) from public;
revoke execute on function public.get_insurance_claims(uuid) from public;
revoke execute on function public.mark_dose_taken(uuid) from public;
revoke execute on function public.ensure_todays_doses(uuid) from public;
revoke execute on function public.create_family_invite(text) from public;
revoke execute on function public.get_dose_logs(uuid, date) from public;
revoke execute on function public.get_life_story_entries(uuid) from public;
revoke execute on function public.create_order(uuid, jsonb, uuid) from public;

-- ---------------------------------------------------------------------------
-- 10. Missing table grants (AUDIT §4.8). No migration ever GRANTed table
-- access to `authenticated` — only `grant execute on function`. Current
-- Supabase cloud projects do not auto-expose new entities, so every table
-- risked "permission denied for table" regardless of RLS. RLS remains the
-- actual gate (a table with RLS enabled and no matching policy still denies
-- every row) — this only lets PostgREST attempt the query at all. The
-- ALTER DEFAULT PRIVILEGES line makes this self-healing for tables any
-- future migration adds.
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
