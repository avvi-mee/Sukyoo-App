// Regression tests for the invite-code hardening in
// supabase/migrations/20260817121000_invite_hardening.sql (AUDIT_2026-08.md
// §4.13): crypto-random codes, a short TTL, mint/guess rate limits, and
// accept_family_invite()'s new jsonb return shape.
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

test('create_family_invite generates an 8-character uppercase-hex code with a 15-minute TTL', async () => {
  const senior = randomUUID();
  await createProfile(harness, { id: senior });

  const { rows } = await harness.asUser(senior, (db) => db.query('select * from create_family_invite()'));
  const invite = rows[0];

  assert.match(invite.code, /^[0-9A-F]{8}$/);
  const ttlMinutes = (new Date(invite.expires_at) - new Date(invite.created_at)) / 60000;
  assert.ok(Math.abs(ttlMinutes - 15) < 1, `expected ~15 minute TTL, got ${ttlMinutes}`);
});

test('a senior cannot mint more than 5 invite codes per hour', async () => {
  const senior = randomUUID();
  await createProfile(harness, { id: senior });

  for (let i = 0; i < 5; i++) {
    await harness.asUser(senior, (db) => db.query('select * from create_family_invite()'));
  }
  await assert.rejects(
    () => harness.asUser(senior, (db) => db.query('select * from create_family_invite()')),
    /too many invite codes/
  );
});

test('accept_family_invite returns {status:"ok", link} for a valid code, and links the accounts', async () => {
  const senior = randomUUID();
  const family = randomUUID();
  await createProfile(harness, { id: senior });
  await createProfile(harness, { id: family, role: 'family' });

  const { rows: inviteRows } = await harness.asUser(senior, (db) => db.query('select * from create_family_invite()'));
  const code = inviteRows[0].code;

  const { rows } = await harness.asUser(family, (db) => db.query('select accept_family_invite($1) as result', [code]));
  const result = rows[0].result;
  assert.equal(result.status, 'ok');
  assert.equal(result.link.senior_id, senior);
  assert.equal(result.link.family_member_id, family);
  assert.equal(result.link.status, 'active');
});

test('accept_family_invite returns {status:"self"} rather than linking a senior to themselves', async () => {
  const senior = randomUUID();
  await createProfile(harness, { id: senior });
  const { rows: inviteRows } = await harness.asUser(senior, (db) => db.query('select * from create_family_invite()'));

  const { rows } = await harness.asUser(senior, (db) =>
    db.query('select accept_family_invite($1) as result', [inviteRows[0].code])
  );
  assert.equal(rows[0].result.status, 'self');
});

test('accept_family_invite returns {status:"invalid"} for an unknown or already-used code', async () => {
  const family = randomUUID();
  await createProfile(harness, { id: family, role: 'family' });

  const { rows } = await harness.asUser(family, (db) => db.query("select accept_family_invite('DEADBEEF') as result"));
  assert.equal(rows[0].result.status, 'invalid');
});

test('a used invite code cannot be redeemed a second time', async () => {
  const senior = randomUUID();
  const family1 = randomUUID();
  const family2 = randomUUID();
  await createProfile(harness, { id: senior });
  await createProfile(harness, { id: family1, role: 'family' });
  await createProfile(harness, { id: family2, role: 'family' });

  const { rows: inviteRows } = await harness.asUser(senior, (db) => db.query('select * from create_family_invite()'));
  const code = inviteRows[0].code;

  await harness.asUser(family1, (db) => db.query('select accept_family_invite($1)', [code]));
  const { rows } = await harness.asUser(family2, (db) => db.query('select accept_family_invite($1) as result', [code]));
  assert.equal(rows[0].result.status, 'invalid');
});

test('too many accept_family_invite guesses in 15 minutes are rate-limited', async () => {
  const family = randomUUID();
  await createProfile(harness, { id: family, role: 'family' });

  let lastResult;
  for (let i = 0; i < 12; i++) {
    const { rows } = await harness.asUser(family, (db) => db.query("select accept_family_invite('WRONGCOD') as result"));
    lastResult = rows[0].result;
  }
  assert.equal(lastResult.status, 'rate_limited');
});
