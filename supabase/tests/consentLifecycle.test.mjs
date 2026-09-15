// End-to-end consent lifecycle: unlinked -> linked-ungranted -> granted ->
// revoked -> unlinked. Exercises the audited get_*() RPC path end to end
// (including the audit_log write) rather than any single policy in
// isolation — this is the flow the whole permission model exists for.
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

test('full consent lifecycle: unlinked -> linked-ungranted -> granted -> revoked -> unlinked', async () => {
  const senior = randomUUID();
  const family = randomUUID();
  await createProfile(harness, { id: senior });
  await createProfile(harness, { id: family, role: 'family' });
  await harness.asAdmin((db) =>
    db.query(
      "insert into public.vitals_readings (owner_id, recorded_by, vital_type, reading_values) values ($1, $1, 'blood_sugar', '{\"value\":110}'::jsonb)",
      [senior]
    )
  );

  // 1. Unlinked: no relationship at all yet.
  await assert.rejects(
    () => harness.asUser(family, (db) => db.query('select get_vitals($1)', [senior])),
    /not authorized/
  );

  // 2. Linked, but not yet granted anything.
  const { rows: linkRows } = await harness.asAdmin((db) =>
    db.query(
      "insert into public.family_links (senior_id, family_member_id, status) values ($1, $2, 'active') returning id",
      [senior, family]
    )
  );
  const linkId = linkRows[0].id;

  await assert.rejects(
    () => harness.asUser(family, (db) => db.query('select get_vitals($1)', [senior])),
    /not authorized/
  );

  // 3. Granted: the family member can now read, and it's audited.
  await harness.asAdmin((db) =>
    db.query("insert into public.permission_grants (family_link_id, resource_type, access_level) values ($1, 'vitals', 'view')", [linkId])
  );

  const { rows: vitalsRows } = await harness.asUser(family, (db) => db.query('select * from get_vitals($1)', [senior]));
  assert.equal(vitalsRows.length, 1);

  const { rows: auditRows } = await harness.asAdmin((db) =>
    db.query("select * from public.audit_log where actor_id = $1 and owner_id = $2 and resource_type = 'vitals'", [family, senior])
  );
  assert.equal(auditRows.length, 1, 'a successful shared read must write exactly one audit_log row');

  // 4. Revoked: set_family_link_status cascades the revoke to the grant.
  await harness.asUser(family, (db) => db.query('select set_family_link_status($1, $2)', [linkId, 'revoked']));

  await assert.rejects(
    () => harness.asUser(family, (db) => db.query('select get_vitals($1)', [senior])),
    /not authorized/
  );

  // 5. Unlinked: the profile cross-visibility granted by an active link is
  // also gone (profiles_select_linked_family only allows an ACTIVE link).
  const { rows: profileRows } = await harness.asUser(family, (db) => db.query('select id from public.profiles where id = $1', [senior]));
  assert.equal(profileRows.length, 0);
});
