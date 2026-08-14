# Play Console "Data safety" form — answer reference

Google Play requires this form to be filled out **in the Play Console UI**
before submission (there's no way to submit it via code). This is a
worksheet mapping what the app actually does, per the schema and code in
this repo, onto Play's specific categories — fill the console form from
this, and update it here if the schema changes. Answer separately for the
**Sukyoo (senior)** and **Sukyoo Family** listings; where they differ, it's
noted below. Confirm current category definitions against the live Play
Console UI before submitting — Google revises this form's structure
periodically.

## Does your app collect or share any of the required user data types?

**Yes.**

## Data types collected

| Play category | Collected? | What, specifically | Shared with 3rd party? | Purpose |
|---|---|---|---|---|
| **Location** — Precise location | Yes (senior app only) | GPS coordinates, only when Emergency SOS is triggered | Yes — care-team/ambulance dispatch partner (once contracted) | App functionality (safety) |
| **Personal info** — Name | Yes | Full name | No | Account, app functionality |
| **Personal info** — Phone number | Yes | Phone number (used for OTP sign-in) | Yes — SMS/OTP provider, MSG91 (SOS fallback) | Account management, app functionality |
| **Personal info** — Other info (date of birth, pincode) | Yes | Date of birth, pincode | No | App functionality (age context, celebrations feature; delivery) |
| **Financial info** — Purchase history | Yes | Order history, amounts | No | App functionality, account management |
| **Financial info** — Payment info | Collected by processor, not by Sukyoo | Razorpay handles card/UPI details directly; Sukyoo receives only payment status | Yes — Razorpay | Payments |
| **Health and fitness** — Health info | Yes | Vitals readings, medications, doctor bookings, insurance policy/claims, uploaded health documents | Yes — a linked family member only if you explicitly grant access; a doctor you book with | App functionality |
| **Messages** — Other in-app messages | No (no chat/forum feature built yet) | — | — | — |
| **Audio files** — Voice or sound recordings | Yes (senior app) | Life-story recordings you choose to make | Yes — a linked family member only if you explicitly grant access | App functionality |
| **Photos and videos** | Yes, if used | Uploaded health record images/PDFs | Only per your sharing settings | App functionality |
| **App activity** — App interactions | Yes, if Sentry enabled | Crash/error reports | Yes — Sentry | Analytics, developer communications (bug fixing) |
| **Device or other IDs** | Yes | Push notification token | Yes — Firebase Cloud Messaging | App functionality (notifications) |

## Data collection is required or optional?

Phone number, name: **required** (can't create an account otherwise).
Health data entry, location for SOS, life-story recording: **optional** — the
app is usable without them, though core features are naturally reduced.

## Is data encrypted in transit?

**Yes** — all traffic goes through Supabase (HTTPS/TLS) and the third-party
SDKs listed above, which all use TLS.

## Can users request data deletion?

**Yes** — describe your actual account-deletion process here once built
(the current schema soft-deletes; a hard-erasure flow is a known follow-up,
see the main build plan's non-engineering dependencies). Play Console
requires either an in-app deletion flow or a web form — link whichever you
build.

## Independent security review

Not yet conducted. Not required by Play unless you tick "independently
validated" for a specific security standard — leave unticked unless true.

## Notes specific to the two listings

- **Sukyoo Family** does not collect precise location (no SOS trigger on
  that app) — omit the Location row for that listing.
- Both apps collect the push token and (if enabled) Sentry crash data.
