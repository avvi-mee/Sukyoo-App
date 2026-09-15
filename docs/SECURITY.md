# Sukyoo — security posture

Last updated 2026-08-18. Companion to `AUDIT_2026-08.md`, which records what was
found and fixed. This document is about what we defend, what we deliberately
don't, and what to do when something goes wrong.

Sukyoo holds health records, medication schedules, insurance claims, precise
emergency geolocation and private voice recordings, for elderly users in India.
That puts it under the **DPDP Act 2023**. Treat everything here as load-bearing.

---

## Threat model

Ordered by how likely we think each is, not by how dramatic.

| # | Threat | Defence |
|---|---|---|
| 1 | **A curious or hostile authenticated user** — someone with a normal account trying to reach another person's data | RLS on all 50 tables, with a hostile-user test suite in CI (`supabase/tests/rls.test.mjs`). Direct writes to `family_links` are closed entirely; links exist only via `accept_family_invite()` |
| 2 | **A family member exceeding their consent** — linked, but reaching data they weren't granted | `permission_grants` is checked per resource type by `has_permission()`; every successful read of a sensitive record writes an `audit_log` row in the same transaction |
| 3 | **Accidental disclosure through telemetry** | Sentry `beforeSend`/`beforeBreadcrumb` strip query strings, UUIDs, tokens, emails and phone numbers (`packages/core/src/scrub.ts`, tested) |
| 4 | **Device theft or loss** | Session tokens in Keychain / Android Keystore, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; screenshots and app-switcher snapshots blocked on health screens |
| 5 | **Abuse of the notification path** | Rate limits on `sos-trigger`, `calls-token`, `razorpay-order`; `calls-token` requires an existing relationship before it will ring anyone |
| 6 | **Payment tampering** | Amounts recomputed server-side; only the HMAC-verified Razorpay webhook may mark anything paid; idempotency on checkout creation |

### What we explicitly do NOT defend against

Being honest about this is part of the posture.

- **A rooted or jailbroken device.** No root detection. On a compromised device
  the Keystore protects the token at rest but not from a determined local
  attacker.
- **A malicious app store build.** No code signing verification beyond the
  platform's own, no anti-tamper, no obfuscation.
- **Network interception by a user-installed CA.** See the pinning decision
  below — this is a deliberate trade, not an oversight.
- **A compromised Supabase project or leaked service-role key.** That key
  bypasses all RLS by design. Rotation is the only control.
- **Insider access.** Anyone with production database credentials can read
  everything and can rewrite `audit_log` (there is no `REVOKE UPDATE` on it).

---

## Certificate pinning — deliberately not implemented

Pinning would close threat #5's network variant. We are not doing it, and the
reason is the product, not the effort.

Sukyoo's Supabase, Agora, Razorpay and FCM endpoints all use certificates those
vendors rotate on their own schedule. A pinned app stops working the moment they
do — and the fix is a store release, which takes days and which an elderly user
may never install. **The failure mode of pinning here is an emergency app that
silently cannot raise an SOS.** That is worse than the MITM it prevents, given
we already require TLS and the attacker needs to have installed a CA on the
device.

If this is revisited, the prerequisites are: pin to an intermediate rather than a
leaf, ship at least two pins (current + next), add a hard kill-switch that
disables pinning via remote config **before** shipping it, and confirm the
remote config path itself is not pinned. Until all four exist, don't.

---

## Open items — decisions, not oversights

These are flagged rather than fixed because they change user-visible behaviour
and need a product call. All are in `supabase/config.toml`.

| Setting | Current | Risk |
|---|---|---|
| `minimum_password_length` | `6` | `123456` is a valid password on a health account |
| `password_requirements` | `""` | No complexity rule at all |
| `enable_confirmations` | `false` | Unverified email addresses get live sessions |
| `[auth.captcha]` | commented out | Account creation is fully automatable |
| `secure_password_change` | `false` | **A stolen session can change the password without reauthentication — locking the real senior out of their own emergency app** |
| `[auth.sessions]` timebox | unset | No forced logout, no idle timeout |
| `max_frequency` | `"1s"` | Auth email can be flooded per address |
| `site_url` | `http://127.0.0.1:3000` | Password-reset links point at localhost |

`secure_password_change` is the one to fix first — it is the only item on this
list that lets an attacker lock the legitimate user *out*.

Also open, from `AUDIT_2026-08.md` §4: `permission_grants` has no `expires_at`
(consent is perpetual until revoked), revocation is **not retroactive for
already-issued storage signed URLs**, and `has_permission()`'s `p_resource_id`
scoping is dead code (it fails closed, so per-record consent simply doesn't
function).

---

## Incident response

**Contact:** *(to be filled — a named person and a monitored address. Required
under DPDP; see the grievance-officer placeholder in `legal/PRIVACY_POLICY.md`.)*

### If a service-role key is exposed

1. Rotate immediately: Supabase Dashboard → Settings → API → Reset
   `service_role`. This invalidates it everywhere at once.
2. Re-set the key on every Edge Function.
3. Review `audit_log` and Supabase logs for reads in the exposure window. The
   key bypasses RLS, so assume total read access until proven otherwise.
4. Treat as a reportable breach if any read of user data cannot be excluded.

### If a user reports someone else seeing their data

1. Do **not** assume it's a support issue. Pull that senior's `family_links` and
   `permission_grants` rows and their `audit_log` history first.
2. Revoke via `set_family_link_status(link_id, 'revoked')` — it revokes every
   grant under the link in the same transaction.
3. Run `npm test`. If any assertion in `rls.test.mjs` fails, it is a platform
   bug affecting every user, not one account.

### DPDP breach notification

The Act requires notifying the Data Protection Board **and** affected users
without undue delay. Practically:

1. Contain first (rotate keys, revoke sessions, disable the affected path via
   remote config once that exists).
2. Determine scope from `audit_log` — this is what it is for. Record which
   `owner_id`s appear.
3. Notify the Board, then affected users in plain language: what was exposed,
   when, what you've done, what they should do.
4. Do not delete or amend logs while doing any of this.

---

## Verifying the posture holds

```bash
npm run typecheck   # both apps
npm test            # 44 assertions: RLS attacks, redaction, session chunking
```

CI additionally runs `gitleaks` (committed secrets), `npm audit` and
`osv-scanner` (advisory).

The permission tests are the real gate. They boot a throwaway Postgres, apply
every migration, and then attack it as a hostile authenticated user through a
non-superuser role with a JWT claim set — because a superuser bypasses RLS and
would make the whole suite pass while proving nothing.

### What none of this can tell you

An automated suite and a source review cannot establish that the **deployed**
project matches these migrations, that Supabase Storage enforces its policies as
written (untestable locally — see `storage_buckets.sql`), or anything about
runtime, network or supply-chain attack paths.

**Commission an external penetration test before real users' health data is on
the platform.** That is not a formality for an app in this category.
