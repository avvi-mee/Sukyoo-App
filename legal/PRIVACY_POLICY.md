# Sukyoo Privacy Policy

**DRAFT — prepared as an engineering-accurate starting point, not a substitute
for legal review.** Given this app processes health data, this must be
reviewed by a lawyer familiar with India's Digital Personal Data Protection
Act, 2023 (DPDP Act) before publishing a live URL for it. Every data category
below was cross-checked against the actual database schema, not written from
a generic template.

_Last updated: [date] · Applies to both the Sukyoo (senior) and Sukyoo Family
apps, which share one backend and one account system._

## Who we are

Sukyoo ("we", "us") operates the Sukyoo and Sukyoo Family mobile apps, a
connected platform for senior citizens and their families in India, covering
healthcare, commerce, community, and entertainment.

## What we collect

| Category | Examples | Why |
|---|---|---|
| Account & identity | Phone number, name, date of birth, pincode | Sign-in (OTP), age-appropriate service, delivery |
| Health data | Vitals readings, medications & dose history, uploaded health records, doctor bookings, insurance policy/claims | Delivering HealthHub features you use directly |
| Location | GPS coordinates, only when you trigger Emergency SOS | Dispatching help to the right place |
| Voice/video/recordings | Video call metadata (not recorded content), life-story audio/video you choose to record | Family video calling; the legacy-recording feature |
| Family relationships | Who you're linked to, and what you've chosen to share with them | The core family-connection feature |
| Commerce & payments | Orders, order contents, payment status | Purchases, subscriptions, family co-ordering. **We do not store your card or UPI details** — payments are processed by Razorpay, a licensed Indian payment gateway; we only receive confirmation that a payment succeeded or failed. |
| Device & usage | Push notification token, app crash/error reports (if Sentry is enabled) | Delivering alerts reliably; fixing bugs |

## How family sharing actually works

This is the part of Sukyoo most different from a typical app, so it gets
explicit treatment: **linking your account to a family member's does not, by
itself, give them access to anything.** You separately choose, per category
(health records, vitals, medications, insurance, orders, life stories),
whether a linked family member can view it — and you can revoke that at any
time. Every time a family member views something you've shared, that access
is logged. The one exception is an Emergency SOS alert: because it exists to
get you help quickly, a linked family member is notified automatically when
you trigger it, without a separate sharing step.

## Who else sees your data

- **Doctors, clinics, diagnostic labs, and other verified partners** you
  book through the app see what's necessary to provide that specific
  service (e.g., a doctor you book a video consult with can see that
  booking).
- **Razorpay** processes payments; **Agora** carries the audio/video for
  calls (we don't record or store call content); **Firebase Cloud
  Messaging** delivers push notifications; an SMS/WhatsApp provider
  (currently MSG91) delivers Emergency SOS fallback alerts if a push
  notification isn't acknowledged quickly enough.
- **We do not sell your data.** Aggregated, anonymized data may be used for
  service improvement or analytics as disclosed in-app if that feature
  launches.

## Your rights

Under the DPDP Act, you can request access to, correction of, or erasure of
your personal data. [Contact method — fill in before publishing.] Revoking a
family member's access to a data category takes effect immediately from the
Insurance & Records screen (or the equivalent sharing control for that data
type).

## Data retention

Account and health data is retained while your account is active. Emergency
SOS records and audit logs of who accessed shared health data are retained
longer, for safety and accountability. [Specific retention periods —
finalize with legal review; the current build soft-deletes rather than
hard-deletes, with hard erasure on request planned as a follow-up.]

## Children

Sukyoo is not directed at children. The "senior" and "family member" roles
both require a phone number capable of receiving OTP verification.

## Changes to this policy

We'll update the "last updated" date above and notify you in-app of material
changes.

## Contact

[Support email / grievance officer contact — required under the DPDP Act,
fill in before publishing.]
