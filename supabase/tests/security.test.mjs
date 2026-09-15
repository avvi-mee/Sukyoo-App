// Regression tests for AUDIT_2026-08.md's CRITICAL/HIGH findings, each
// against the fix in supabase/migrations/20260817120000_security_hardening.sql.
// Run through a genuine non-superuser `authenticated` role (see harness.mjs)
// — the whole point is that these fail if the RLS/RPC layer regresses, not
// just that the SQL parses.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createHarness, createProfile } from './harness.mjs';

let harness;

before(async () => {
  harness = await createHarness();
});

after(async () => {
  await harness.close();
});

// ---------------------------------------------------------------------------
// 1. Self-service admin (AUDIT §4.1)
// ---------------------------------------------------------------------------

test('signing up with role: admin in metadata is coerced to senior', async () => {
  const userId = randomUUID();
  await harness.asAdmin((db) =>
    db.query("insert into auth.users (id, raw_user_meta_data) values ($1, '{\"role\":\"admin\",\"full_name\":\"Attacker\"}'::jsonb)", [
      userId,
    ])
  );
  const { rows } = await harness.asAdmin((db) => db.query('select role from public.profiles where id = $1', [userId]));
  assert.equal(rows[0].role, 'senior');
});

test('a user cannot change their own role via update', async () => {
  const userId = randomUUID();
  await createProfile(harness, { id: userId });
  await assert.rejects(
    () => harness.asUser(userId, (db) => db.query("update public.profiles set role = 'admin' where id = $1", [userId])),
    /cannot change your own role/
  );
});

// ---------------------------------------------------------------------------
// 2. Forged family links (AUDIT §4.2)
// ---------------------------------------------------------------------------

test('a family member cannot insert a family_links row naming a stranger as senior_id', async () => {
  const stranger = randomUUID();
  const attacker = randomUUID();
  await createProfile(harness, { id: stranger, role: 'senior' });
  await createProfile(harness, { id: attacker, role: 'family' });

  await assert.rejects(
    () =>
      harness.asUser(attacker, (db) =>
        db.query(
          "insert into public.family_links (senior_id, family_member_id, status) values ($1, $2, 'active')",
          [stranger, attacker]
        )
      ),
    /row-level security policy/
  );
});

test('set_family_link_status only allows revoking, never self-activating, and cascades to grants', async () => {
  const senior = randomUUID();
  const family = randomUUID();
  await createProfile(harness, { id: senior, role: 'senior' });
  await createProfile(harness, { id: family, role: 'family' });

  const { rows: linkRows } = await harness.asAdmin((db) =>
    db.query(
      "insert into public.family_links (senior_id, family_member_id, status) values ($1, $2, 'active') returning id",
      [senior, family]
    )
  );
  const linkId = linkRows[0].id;
  await harness.asAdmin((db) =>
    db.query("insert into public.permission_grants (family_link_id, resource_type, access_level) values ($1, 'vitals', 'view')", [
      linkId,
    ])
  );

  // A participant cannot re-activate a link through this RPC.
  await assert.rejects(
    () => harness.asUser(family, (db) => db.query('select set_family_link_status($1, $2)', [linkId, 'active'])),
    /only revoking/
  );

  // Revoking cascades to the grant in the same transaction.
  await harness.asUser(family, (db) => db.query('select set_family_link_status($1, $2)', [linkId, 'revoked']));
  const { rows: grantRows } = await harness.asAdmin((db) =>
    db.query('select revoked_at from public.permission_grants where family_link_id = $1', [linkId])
  );
  assert.ok(grantRows[0].revoked_at !== null, 'grant should be revoked once the link is revoked');
});

// ---------------------------------------------------------------------------
// 3. Fabricated health data (AUDIT §4.3)
// ---------------------------------------------------------------------------

test('a user cannot write a vitals_readings row onto a stranger\'s owner_id', async () => {
  const victim = randomUUID();
  const attacker = randomUUID();
  await createProfile(harness, { id: victim });
  await createProfile(harness, { id: attacker });

  await assert.rejects(
    () =>
      harness.asUser(attacker, (db) =>
        db.query(
          "insert into public.vitals_readings (owner_id, recorded_by, vital_type, reading_values) values ($1, $2, 'blood_sugar', '{\"value\":999}'::jsonb)",
          [victim, attacker]
        )
      ),
    /row-level security policy/
  );
});

test('a user cannot upload a health_records row onto a stranger\'s owner_id', async () => {
  const victim = randomUUID();
  const attacker = randomUUID();
  await createProfile(harness, { id: victim });
  await createProfile(harness, { id: attacker });

  await assert.rejects(
    () =>
      harness.asUser(attacker, (db) =>
        db.query(
          "insert into public.health_records (owner_id, uploaded_by, record_type, storage_path) values ($1, $2, 'blood_test', 'x')",
          [victim, attacker]
        )
      ),
    /row-level security policy/
  );
});

test('a user cannot add a medication to a stranger\'s record by naming themselves prescribed_by', async () => {
  const victim = randomUUID();
  const attacker = randomUUID();
  await createProfile(harness, { id: victim });
  await createProfile(harness, { id: attacker });

  await assert.rejects(
    () =>
      harness.asUser(attacker, (db) =>
        db.query(
          "insert into public.medications (owner_id, prescribed_by, name, schedule) values ($1, $2, 'Insulin', '[]'::jsonb)",
          [victim, attacker]
        )
      ),
    /row-level security policy/
  );
});

// ---------------------------------------------------------------------------
// 4. Doctor self-verification (AUDIT §4.9) + double-booking (AUDIT §4.11)
// ---------------------------------------------------------------------------

test('a doctor cannot set their own is_verified', async () => {
  const doctorId = randomUUID();
  await createProfile(harness, { id: doctorId, role: 'doctor' });
  await harness.asAdmin((db) => db.query('insert into public.doctor_profiles (user_id, is_verified) values ($1, false)', [doctorId]));

  await assert.rejects(
    () => harness.asUser(doctorId, (db) => db.query('update public.doctor_profiles set is_verified = true where user_id = $1', [doctorId])),
    /cannot verify themselves/
  );
});

test('book_doctor_slot refuses to double-book an already-booked slot', async () => {
  const doctorId = randomUUID();
  const patientA = randomUUID();
  const patientB = randomUUID();
  await createProfile(harness, { id: doctorId, role: 'doctor' });
  await createProfile(harness, { id: patientA });
  await createProfile(harness, { id: patientB });
  await harness.asAdmin((db) => db.query('insert into public.doctor_profiles (user_id, is_verified) values ($1, true)', [doctorId]));
  const { rows: slotRows } = await harness.asAdmin((db) =>
    db.query(
      "insert into public.doctor_availability_slots (doctor_id, start_at, end_at, mode) values ($1, now() + interval '1 day', now() + interval '1 day 30 minutes', 'video') returning id",
      [doctorId]
    )
  );
  const slotId = slotRows[0].id;

  await harness.asUser(patientA, (db) =>
    db.query('select book_doctor_slot($1, $2, $3, $4)', [slotId, patientA, patientA, 'video'])
  );

  await assert.rejects(
    () => harness.asUser(patientB, (db) => db.query('select book_doctor_slot($1, $2, $3, $4)', [slotId, patientB, patientB, 'video'])),
    /already booked/
  );

  const { rows } = await harness.asAdmin((db) => db.query('select is_booked from public.doctor_availability_slots where id = $1', [slotId]));
  assert.equal(rows[0].is_booked, true);
});

test('book_doctor_slot refuses an unverified doctor', async () => {
  const doctorId = randomUUID();
  const patient = randomUUID();
  await createProfile(harness, { id: doctorId, role: 'doctor' });
  await createProfile(harness, { id: patient });
  await harness.asAdmin((db) => db.query('insert into public.doctor_profiles (user_id, is_verified) values ($1, false)', [doctorId]));
  const { rows: slotRows } = await harness.asAdmin((db) =>
    db.query(
      "insert into public.doctor_availability_slots (doctor_id, start_at, end_at, mode) values ($1, now() + interval '1 day', now() + interval '1 day 30 minutes', 'video') returning id",
      [doctorId]
    )
  );
  await assert.rejects(
    () => harness.asUser(patient, (db) => db.query('select book_doctor_slot($1, $2, $3, $4)', [slotRows[0].id, patient, patient, 'video'])),
    /not verified/
  );
});

// ---------------------------------------------------------------------------
// 5. Stuck SOS events (AUDIT §4.10)
// ---------------------------------------------------------------------------

test('set_sos_event_status enforces the transition state machine and participant check', async () => {
  const senior = randomUUID();
  const family = randomUUID();
  const stranger = randomUUID();
  await createProfile(harness, { id: senior });
  await createProfile(harness, { id: family, role: 'family' });
  await createProfile(harness, { id: stranger, role: 'family' });
  await harness.asAdmin((db) =>
    db.query("insert into public.family_links (senior_id, family_member_id, status) values ($1, $2, 'active')", [senior, family])
  );
  const { rows: eventRows } = await harness.asAdmin((db) =>
    db.query("insert into public.sos_events (senior_id) values ($1) returning id, status", [senior])
  );
  const eventId = eventRows[0].id;
  assert.equal(eventRows[0].status, 'triggered');

  // A non-participant cannot touch it.
  await assert.rejects(() => harness.asUser(stranger, (db) => db.query('select set_sos_event_status($1, $2)', [eventId, 'acked'])));

  // A linked family member can ack it.
  await harness.asUser(family, (db) => db.query('select set_sos_event_status($1, $2)', [eventId, 'acked']));

  // acked -> triggered is not a valid transition.
  await assert.rejects(
    () => harness.asUser(family, (db) => db.query('select set_sos_event_status($1, $2)', [eventId, 'triggered'])),
    /invalid status transition/
  );

  // acked -> resolved is valid, and sets resolved_at.
  await harness.asUser(senior, (db) => db.query('select set_sos_event_status($1, $2)', [eventId, 'resolved']));
  const { rows } = await harness.asAdmin((db) => db.query('select status, resolved_at from public.sos_events where id = $1', [eventId]));
  assert.equal(rows[0].status, 'resolved');
  assert.ok(rows[0].resolved_at !== null);
});

// ---------------------------------------------------------------------------
// 6. Order payer visibility + view-vs-manage consent (AUDIT §4)
// ---------------------------------------------------------------------------

test('a payer who is neither the order owner nor the orderer can still see the order', async () => {
  const senior = randomUUID();
  const payer = randomUUID();
  await createProfile(harness, { id: senior });
  await createProfile(harness, { id: payer, role: 'family' });
  const { rows: orderRows } = await harness.asAdmin((db) =>
    db.query(
      "insert into public.orders (belongs_to_user_id, ordered_by_user_id, ordered_by_role, payer_user_id) values ($1, $1, 'self', $2) returning id",
      [senior, payer]
    )
  );

  const { rows } = await harness.asUser(payer, (db) => db.query('select id from public.orders where id = $1', [orderRows[0].id]));
  assert.equal(rows.length, 1, 'payer should see the order via orders_select_participant');
});

test('create_order refuses a family member with only a view grant, and accepts one with a manage grant', async () => {
  const senior = randomUUID();
  const family = randomUUID();
  await createProfile(harness, { id: senior });
  await createProfile(harness, { id: family, role: 'family' });
  const { rows: linkRows } = await harness.asAdmin((db) =>
    db.query(
      "insert into public.family_links (senior_id, family_member_id, status) values ($1, $2, 'active') returning id",
      [senior, family]
    )
  );
  const { rows: categoryRows } = await harness.asAdmin((db) =>
    db.query("insert into public.product_categories (slug, name) values ('meds', 'Medicines') returning id")
  );
  const { rows: productRows } = await harness.asAdmin((db) =>
    db.query('insert into public.products (category_id, name, price) values ($1, $2, $3) returning id', [
      categoryRows[0].id,
      'Paracetamol',
      50,
    ])
  );
  const items = JSON.stringify([{ product_id: productRows[0].id, quantity: 1 }]);

  await harness.asAdmin((db) =>
    db.query("insert into public.permission_grants (family_link_id, resource_type, access_level) values ($1, 'order', 'view')", [
      linkRows[0].id,
    ])
  );
  await assert.rejects(
    () => harness.asUser(family, (db) => db.query('select create_order($1, $2)', [senior, items])),
    /not authorized/
  );

  await harness.asAdmin((db) =>
    db.query("update public.permission_grants set access_level = 'manage' where family_link_id = $1", [linkRows[0].id])
  );
  await harness.asUser(family, (db) => db.query('select create_order($1, $2)', [senior, items]));
});

// ---------------------------------------------------------------------------
// 7. Duplicate active permission grants (AUDIT §4.16)
// ---------------------------------------------------------------------------

test('toggling a permission grant on/off/on never leaves two active rows', async () => {
  const senior = randomUUID();
  const family = randomUUID();
  await createProfile(harness, { id: senior });
  await createProfile(harness, { id: family, role: 'family' });
  const { rows: linkRows } = await harness.asAdmin((db) =>
    db.query(
      "insert into public.family_links (senior_id, family_member_id, status) values ($1, $2, 'active') returning id",
      [senior, family]
    )
  );
  const linkId = linkRows[0].id;

  await harness.asAdmin((db) =>
    db.query("insert into public.permission_grants (family_link_id, resource_type, access_level) values ($1, 'vitals', 'view')", [linkId])
  );
  await harness.asAdmin((db) =>
    db.query("update public.permission_grants set revoked_at = now() where family_link_id = $1 and resource_type = 'vitals'", [linkId])
  );
  await harness.asAdmin((db) =>
    db.query("insert into public.permission_grants (family_link_id, resource_type, access_level) values ($1, 'vitals', 'view')", [linkId])
  );

  await assert.rejects(() =>
    harness.asAdmin((db) =>
      db.query("insert into public.permission_grants (family_link_id, resource_type, access_level) values ($1, 'vitals', 'view')", [linkId])
    )
  );

  const { rows } = await harness.asAdmin((db) =>
    db.query("select count(*) from public.permission_grants where family_link_id = $1 and resource_type = 'vitals' and revoked_at is null", [
      linkId,
    ])
  );
  assert.equal(Number(rows[0].count), 1);
});

// ---------------------------------------------------------------------------
// 8. Anonymously-callable consent oracle (AUDIT §4.14) + table grants (§4.8)
// ---------------------------------------------------------------------------

test('has_permission is no longer callable by an unauthenticated (anon) caller', async () => {
  const senior = randomUUID();
  await createProfile(harness, { id: senior });
  await assert.rejects(
    () => harness.asAnon((db) => db.query("select has_permission($1, $1, 'vitals', null)", [senior])),
    /permission denied for function has_permission/
  );
});

test('a signed-in user can at least query a public table without a permission-denied error (table GRANTs present)', async () => {
  const user = randomUUID();
  await createProfile(harness, { id: user });
  // Correct-but-empty is fine here; a bare "permission denied for table"
  // before any row is even evaluated is the regression this guards against.
  const { rows } = await harness.asUser(user, (db) => db.query('select * from public.wellness_sessions'));
  assert.ok(Array.isArray(rows));
});
