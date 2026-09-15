# Sukyoo Operations console (`apps/admin`)

Next.js 15 App Router + TypeScript + Tailwind 4, on the same Supabase project as
the two mobile apps. Web, because ops staff work at desks for whole shifts.

```bash
npm run admin          # dev server on :3000
npm run build:admin    # production build
```

Needs `apps/admin/.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. **The service-role key must never appear in this
app** — see "Why the anon key" below.

---

## Three properties this console is built around

Everything else is a consequence of these.

### 1. The database is the control, not the UI

Every permission is enforced by an RLS policy calling `staff_has_permission()`,
and the permission matrix lives in `staff_role_permissions` — a table, not a
constant in TypeScript. `src/lib/permissions.ts` mirrors it so the UI can decide
what to *render*, and `requirePermission()` fails loudly at the route boundary,
but neither is the control. If the two ever disagree, the database wins and the
operator sees an empty list.

That asymmetry is deliberate: a UI bug should under-show, never over-show.

### 2. Reading health data requires a reason, and always leaves a record

There is **no staff SELECT policy** on `vitals_readings`, `medications`,
`health_records` or `insurance_claims`. The only door is
`staff_read_senior_health()`, which checks `user.read_health`, rejects a reason
note under 10 characters, and writes the `audit_log` row *in the same
transaction as the read*.

So the audit trail cannot be forgotten — only deleted, and deleting it needs
database credentials rather than a code change. A developer who bypassed
`src/lib/audit.ts` and queried the tables directly would get nothing back.

Health data is also not rendered on page load. An operator picks a record type,
picks a typed reason, and writes a note first. That friction is the point: a
console that shows blood sugar the moment you open a profile produces an audit
log full of accidental reads, which makes it useless for answering *"who looked
at my records?"* — the exact question the DPDP Act entitles that person to ask.

### 3. Staff cannot rewrite a senior's consent

`set_family_link_status()` is senior-only (`where senior_id = auth.uid()`). The
Pairings screen therefore **logs a revocation request** rather than performing
one, and says so in the UI.

This is a real constraint, not an oversight. Giving ops the ability to silently
alter who can see someone's health records would undermine the entire permission
model. If unattended revocation is ever genuinely needed — a DPDP erasure
request, a safeguarding case — it needs its own reviewed RPC with a second
approver, not a widening of this one.

---

## Authentication

Password **and** TOTP, both mandatory.

Supabase issues a session at `aal1` after a password login and raises it to
`aal2` only once a TOTP challenge is verified. `src/lib/supabase/middleware.ts`
requires `aal2` for every console route, so a stolen password on its own reaches
nothing. A staff account with no factor enrolled is redirected to
`/mfa/enroll` and cannot skip it.

The middleware `matcher` covers everything except static assets, so the gate is
the **default** for a new route rather than something a developer remembers to
add.

### Why the anon key

The console uses the anon key and each operator's own session, so every query
runs as that person under RLS. A bug in this app can therefore leak nothing an
RLS policy wouldn't already permit. Using the service-role key would make the
whole RBAC layer decorative.

### Staff cannot self-register

`staff_members` has no INSERT policy at all. Provisioning goes through
`provision_staff_member()`, which is revoked from `anon`, `authenticated` and
`public` — service role only. Combined with `handle_new_user()` (migration 0008)
coercing every self-service signup to `senior`/`family`, there is no client path
to becoming staff.

To provision the first administrator, from the Supabase SQL editor:

```sql
-- The person must already have signed up (any Sukyoo app, or Dashboard → Auth).
select public.provision_staff_member(
  '<their auth.users id>',
  '{super_admin}'::public.staff_role[]
);

-- A partner's own staff, confined to one organisation:
select public.provision_staff_member(
  '<user id>', '{vendor_admin}'::public.staff_role[], '<organizations.id>'
);
```

`vendor_admin` without an `organization_id` is rejected, as is internal staff
*with* one — both are configuration errors that would silently mis-scope access.

---

## Roles

| Role | Can |
|---|---|
| `super_admin` | Everything. Derived from the permission enum, so a new permission is never accidentally omitted |
| `ops_agent` | SOS queue (read + manage), user profiles, support. **No health data** |
| `care_team` | SOS queue, user profiles, **and health data** (reason-gated) |
| `content_manager` | Content library |
| `vendor_manager` | Vendors and partners, user profiles |
| `finance` | Finance, payouts, commission ledger, vendor read |
| `support` | Support queue, user profiles |
| `compliance_officer` | Consent, audit trail, doctor verification, DPDP requests |
| `auditor` | Every `*.read` and **no** `*.manage`. Explicitly not `user.read_health` — read-only does not mean read-everything |
| `vendor_admin` | One organisation's own vendor data, nothing else |

Setting `staff_members.is_active = false` revokes every permission at once.

Note that `ops_agent` deliberately lacks `user.read_health`: the person triaging
an SOS needs a name, a phone number and a location, not a medication list.
Escalating to clinical detail is `care_team`'s job, and the split keeps the audit
log meaningful.

---

## Modules

| Route | Permission | State |
|---|---|---|
| `/` | any staff role | Dashboard tiles, each RLS-filtered so an absent permission renders no tile at all |
| `/sos` | `sos.read` | **Live SOS queue.** Realtime, audible alarm, per-recipient delivery counts, dispatch timeline, mandatory notes, shift handover |
| `/people` | `user.read` | Search by name/phone; 360° view with linked family, SOS history, orders, and the reason-gated health viewer |
| `/pairings` | `compliance.read` | Every link and exactly what each family member was granted |
| `/vendors` | `vendor.read` | Partner pipeline, document expiry sweep, approval/suspension, rate cards, payout runs |
| `/vendors/[id]/catalogue` | `vendor.read` | Listings with a visible-to-seniors column, plus CSV import with a diff preview |
| `/subscriptions` | `finance.read` | Active auto-reorders, recent orders, and **order/payment mismatch detection** — a paid order with no captured payment is the shape of a webhook that never landed |
| `/audit` | `audit.read` | Full trail, staff access highlighted |

Content and livestreams (4B) and support tickets (4D) are **not built**. They are
deliberately absent from the navigation rather than linked to a 404 — a nav item
is a promise.

### Partners, specifically

Four things here are enforced in Postgres, and the UI only explains them:

- **A partner cannot approve, reinstate, or verify itself.** `set_partner_status()`
  and `review_partner_document()` both refuse any caller with a `staff_org_id`.
  A `vendor_admin` sees the status section as read-only text saying so.
- **Approval is blocked while mandatory paperwork is missing, unverified, or
  expired.** The checklist on the page is the `partner_document_requirements`
  table joined against what has arrived, so it cannot drift from what the RPC
  actually checks. Adding a partner type is a data change, not a code change.
- **Suspension delists immediately, including at checkout.** The catalogue
  policies call `org_is_live()`, and `create_order()` re-checks it — necessary
  because that function is `SECURITY DEFINER`, so RLS never applies to it and a
  client holding an old `product_id` would otherwise still be able to buy.
- **A payout run cannot be approved by whoever built it.** `approve_payout_run()`
  raises on `created_by = auth.uid()`; the Approve button is replaced with the
  reason rather than merely disabled.

Compliance documents live in the private `partner-documents` bucket and are only
ever reached through a two-minute signed URL, opened in a new tab so the
capability does not sit in this page's DOM. There is no update or delete policy on
that bucket: superseding a document means uploading the replacement and marking
the old row expired, which keeps the history.

Catalogue import re-parses the CSV server-side on apply rather than trusting the
diff the browser holds — the preview is a rendering, not an instruction. Rows
missing from the file are offered as a *delist* (`is_active = false`), never a
delete, because past orders point at those rows. Products flagged
`requires_prescription` stay listed but are withheld from seniors and refused at
checkout, since no prescription-upload flow exists yet.

### The SOS queue, specifically

Two details worth knowing before anyone changes them:

- **The alarm is generated with WebAudio, not an audio file.** An `<audio src>`
  that 404s fails silently, and on this screen silence means a missed emergency.
  Browsers also block sound before a user gesture, so the page asks the operator
  to arm it once per shift and *says* that it is doing so, rather than presenting
  a mute alarm as working.
- **"Family reached" is the honest number.** `sos-trigger` records per-recipient
  delivery, so a zero means no family device actually received the alert — and
  the card says so in red, with the instruction to call the senior directly. A
  senior with nobody linked gets the same treatment.

Ops closing an event writes a `care_dispatch` record rather than rewriting
`sos_events.status`, because `resolve_sos_event()` belongs to the senior. Their
view of their own alert stays theirs.

---

## Verifying

```bash
npm run typecheck   # includes apps/admin
npm test            # 56 assertions, 12 of them staff RBAC
```

The RBAC suite (`supabase/tests/staffRbac.test.mjs`) attacks the model as a
hostile staff member: a client trying to make itself staff, a `vendor_admin`
reaching across tenancy, an `ops_agent` reaching for health data, a doctor
self-verifying. **It caught two real bugs on its first run** — see
`AUDIT_2026-08.md`.

Route guards, checked against a production build:

```
/  /sos  /people  /pairings  /subscriptions  /audit  /people/[id]  → 307 /login
/login  /mfa  /mfa/enroll                                          → 200
GET /auth/signout                                                  → 405 (POST only)
```

### Known dev-only wrinkle

`next dev` logs `Could not find the module … segment-explorer-node.js` and can
500 on `/`. That is Next's devtools overlay failing to resolve through this
hoisted npm-workspace layout; it does not affect `next build` or `next start`.
Verify behaviour against the production build.

Also: if routes 404 after adding a page, delete `.next` and rebuild — a failed
build can leave a stale `app-paths-manifest.json` that omits routes whose HTML
was nonetheless emitted.
