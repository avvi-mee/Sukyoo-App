// Boots a throwaway Postgres (PGlite — WASM, no Docker, so this runs on
// Windows dev machines and in CI the same way) and applies every migration
// under supabase/migrations against it. Tests then attack it through a
// genuine non-superuser `authenticated` role with a per-call JWT claim,
// never as the connection's own superuser — a superuser bypasses RLS
// entirely and would make every assertion here pass vacuously regardless of
// whether the policies are actually correct.
//
// This is a shim of the parts of Supabase's platform schema the migrations
// assume (auth.users/auth.uid(), storage.objects/storage.foldername(), and
// the anon/authenticated/service_role roles) — not a Supabase emulator. See
// docs/SECURITY.md for what it deliberately can't verify: whether the
// *deployed* project matches these migrations, real Supabase Storage
// enforcement, and anything in the Deno-side Edge Functions.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

const BOOTSTRAP_SQL = `
-- Roles first — everything below grants to them.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

grant anon, authenticated, service_role to current_user;

create schema if not exists auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  phone text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Real Supabase's auth.uid() reads the "sub" claim off the request JWT,
-- exposed to Postgres as the GUC request.jwt.claims. Tests set that GUC
-- per simulated request instead of minting real JWTs (see asUser() below).
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;

-- Real Supabase projects grant USAGE on auth (and EXECUTE on its public
-- functions) to anon/authenticated as platform setup, outside any migration
-- — RLS policies and trigger functions that call auth.uid() as the
-- querying role, not a SECURITY DEFINER one, depend on this. Without it
-- every such policy fails closed with "permission denied for schema auth"
-- regardless of whether the policy logic itself is right, which would make
-- a rejected-write assertion here pass for the wrong reason.
grant usage on schema auth to anon, authenticated;

create schema if not exists storage;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text) returns text[]
language sql immutable
as $$
  select string_to_array(name, '/');
$$;

grant usage on schema storage to anon, authenticated;
`;

export async function createHarness() {
  const db = new PGlite();
  await db.exec(BOOTSTRAP_SQL);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await db.exec(sql);
    } catch (err) {
      throw new Error(`Migration ${file} failed to apply: ${err.message}`);
    }
  }

  async function setClaim(userId) {
    const claim = userId ? JSON.stringify({ sub: userId }) : '';
    await db.exec(`select set_config('request.jwt.claims', '${claim.replace(/'/g, "''")}', false)`);
  }

  return {
    db,
    migrationFiles: files,

    // Runs fn as a real authenticated, non-superuser Postgres role with
    // auth.uid() resolving to userId — the actual enforcement boundary
    // PostgREST relies on in production.
    async asUser(userId, fn) {
      await db.exec('set role authenticated');
      await setClaim(userId);
      try {
        return await fn(db);
      } finally {
        await setClaim(null);
        await db.exec('reset role');
      }
    },

    async asAnon(fn) {
      await db.exec('set role anon');
      try {
        return await fn(db);
      } finally {
        await db.exec('reset role');
      }
    },

    // Bypasses RLS entirely (the connection's own superuser role) — only for
    // test setup/fixtures (seeding a profile, a doctor, a product), never for
    // the assertion itself. A test that asserts anything while running as
    // this role is testing nothing.
    async asAdmin(fn) {
      return fn(db);
    },

    async close() {
      await db.close();
    },
  };
}

// Convenience for creating a profile + matching auth.users row in one call —
// every test needs at least two of these (an owner and an attacker/family
// member). Only inserts into auth.users: the on_auth_user_created trigger
// (handle_new_user()) creates the matching profiles row itself, exactly as
// it would for a real signup — inserting into both directly would race
// against that trigger and violate profiles_pkey.
//
// handle_new_user() only ever produces 'senior' or 'family' from signup
// metadata (that's the fix under test in security.test.mjs), so a role
// outside that pair (doctor, admin, ops_agent, ...) is set with a follow-up
// UPDATE as a fixture concern, standing in for whatever out-of-band
// provisioning path a real deployment uses for those roles.
export async function createProfile(harness, { id, role = 'senior', fullName = 'Test User', phone = null }) {
  const metaRole = role === 'family' ? 'family' : 'senior';
  await harness.asAdmin((db) =>
    db.query(
      "insert into auth.users (id, phone, raw_user_meta_data) values ($1, $2, jsonb_build_object('role', $3::text, 'full_name', $4::text))",
      [id, phone, metaRole, fullName]
    )
  );
  if (role !== metaRole) {
    await harness.asAdmin((db) => db.query('update public.profiles set role = $1 where id = $2', [role, id]));
  }
}
