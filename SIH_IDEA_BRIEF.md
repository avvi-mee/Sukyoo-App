# Vayoo — SIH idea brief (SIH1778)

Everything needed to write the pitch deck. Written 2026-08-19 against the real
codebase, so the claims here are checkable — see the "What is actually built"
section before you promise anything on a slide.

Feed this into your deck template section by section. Where it says
**[VERIFY]**, you must find and cite a real source; do not use a number you
cannot attribute, because that is the first thing a judge will ask about.

---

## 1. The one-liner

> **Vayoo is a two-app care system that lets an adult child look after an
> elderly parent from another city — with the parent in control of exactly what
> gets shared.**

Sixty seconds of it:

> India's elderly are increasingly living alone while their children work in
> other cities. When something goes wrong, there is no reliable path from "my
> mother has fallen" to "someone knows and is coming." Vayoo is two paired
> mobile apps — one built for a 70-year-old, one for their family — connected by
> an emergency pipeline that reaches a sleeping relative's locked phone, a health
> record the family can see only what they have been given, and a marketplace for
> the medicines, tests and home care that follow. It is built, tested, and
> designed around India's Digital Personal Data Protection Act from the schema
> up.

---

## 2. The problem

Build the argument in this order. It is stronger as a chain than as a list.

**a. The demographic shift is real and fast.**
India's 60+ population is growing far faster than the population overall.
**[VERIFY]** — cite the *UNFPA India Ageing Report 2023* and *Census 2011* for
the current count and the 2050 projection. Use the actual figures from those
documents, not rounded numbers from a news article.

**b. Families have physically separated.**
Internal migration for work means the traditional joint-family care
arrangement — the thing that used to make all of this unnecessary — is no longer
available to a large share of households. **[VERIFY]** — cite the *Census 2011
migration tables* or a *LASI (Longitudinal Ageing Study in India, IIPS)* finding
on elderly living alone or with spouse only.

**c. So the failure is not medical. It is a coordination failure.**
This is the important framing, and it is what makes the idea a software problem
rather than a hospital problem:

- A senior who falls at 2am cannot reliably reach anyone.
- A daughter in Bengaluru has no way to know if her father took his blood
  pressure tablet, short of phoning to ask and being told "yes yes".
- Prescriptions, lab reports and insurance papers live in a plastic bag.
- When the family *does* try to help remotely, the only options are all-or-nothing:
  either they get the parent's passwords and act as them, or they get nothing.

**d. And the existing options each solve one slice.**
Panic-button pendants do the alert but nothing after it. Teleconsult apps do the
doctor but not the emergency. Pharmacy apps do delivery but assume the buyer is
the patient. Nothing joins them, and nothing treats the *family member* as a
first-class user with their own limited, revocable access.

> **The gap in one sentence:** there is no system where a senior's emergency,
> their health record, and their family's ability to act on both live in the same
> place under the senior's own consent.

---

## 3. Who it is for

Three personas. Name them in the deck; judges remember names.

- **Meera, 72, Kochi.** Lives with her husband. Reads at arm's length, mistrusts
  anything that asks for an OTP twice. Wants a big button that works and does not
  want to learn an app.
- **Anil, 41, Bengaluru.** Meera's son. Wants to know she is fine without calling
  three times a day, and wants to *pay for* and *order* her medicines without
  needing her card.
- **Ops / care team.** Sees the emergency queue, dispatches help, and — crucially
  — cannot read anybody's health data without giving a typed reason that is
  logged forever.

---

## 4. What it actually does

Four pillars. Each maps to real, working code.

### Pillar 1 — Emergency (the thing that justifies the product)

- Senior holds one large button. The app captures **location** and raises an SOS.
- An Edge Function fans a push to **every linked family device** — Android via
  FCM, iOS via APNs directly (iOS device tokens are APNs tokens and cannot be
  delivered through FCM; this is the kind of detail that kills these projects).
- On the family phone the alert is a **full-screen notification over the lock
  screen** that wakes the device — not a banner that waits to be noticed.
- **If nobody acknowledges within a grace window**, a scheduled function
  escalates to SMS / WhatsApp. One escalation per event, so a real emergency
  cannot have its fallback burned early.
- The console shows **"family reached: N"** from per-recipient delivery records.
  If it is zero, the card says so in red and tells the operator to phone the
  senior directly. An emergency dashboard that cannot admit failure is worse than
  none.

### Pillar 2 — Health, with consent as the primitive

- Vitals, medicines with per-dose logs, lab reports, insurance policies and
  claims.
- **The consent model is the differentiator.** A family link is not "access". The
  senior grants *per category* (readings / medicines / reports / insurance /
  stories / ordering) and *per level* (view or manage), and can revoke any of it
  at any moment. Revoking a pairing withdraws every grant under it in the same
  transaction.
- Staff cannot rewrite a senior's consent — the function that changes it is
  restricted to the senior themselves. The ops console can only *log a request*
  and tell you to contact them. That was a deliberate choice: the honest UI is
  one that admits it needs the person.

### Pillar 3 — Everything that follows an emergency

- **Telemedicine** — book a slot; the server refuses to book an unverified
  practitioner. Not a hidden button: a database-level check, because under the
  Telemedicine Practice Guidelines 2020 that is precisely the check that must not
  live in the client.
- **Pharmacy and diagnostics** with a **three-actor order model**: who the order
  is *for*, who *placed* it, and who *paid* can all be three different people.
  Every other shopping app assumes they are the same person; for elderly care
  they almost never are.
- Home care, insurance claims, wellness programmes.
- **Prescription medicines are refused at checkout**, not just hidden, because
  there is no prescription-upload flow yet. Selling them and hoping is the
  alternative.

### Pillar 4 — Dignity, not just safety

This is the pillar that makes it a *care* product rather than a monitoring
product, and it is what will separate you from every other "elderly safety" entry.

- **Life stories** — the senior records audio memoirs. Shared with family only by
  the same explicit grant as health data.
- Live programmes (bhajans, talks, exercise classes) with opt-in reminders.
- Events, clubs, classes, accessible travel.
- Accessibility throughout: three text sizes the whole app honours, large touch
  targets, plain language — the delete-account screen says "your health readings,
  medicines, reports and recordings are permanently deleted", not "exercise your
  right to erasure".

---

## 5. Why this wins on the parts nobody else does

Lead with these. They are the defensible claims.

1. **The database is the security boundary, not the UI.** Every rule is a
   Postgres row-level-security policy. A stolen phone, a modified client, or a
   direct API call all hit the same wall. Judges ask "what if someone calls your
   API directly" — the answer is "they get nothing, and here is the test that
   proves it."

2. **162 automated adversarial tests.** The suite runs every migration into a
   throwaway Postgres and then *attacks* it as a hostile authenticated user. It
   has caught real bugs, including three written the same day. Say this number.
   Almost no hackathon entry has one.

3. **DPDP Act 2023 designed in, not bolted on.** In-app data export and account
   deletion; erasure needs **two different staff members**; an immutable erasure
   log that survives the deletion; and every staff read of health data requires a
   typed reason and writes an audit row *in the same transaction as the read*, so
   the log cannot be forgotten — only deleted, which needs database credentials
   rather than a code change.

4. **Honest engineering.** The content library ships empty because no licensing
   deal exists, and both apps say so. A suspended partner disappears from the
   catalogue *and* is refused at checkout. This reads as maturity, and it is the
   opposite of most demos.

5. **Built for India specifically.** UPI app-switch declared for iOS, MSG91 with
   DLT-registered templates for SMS, 108 named on the maintenance screen,
   Asia/Kolkata scheduling, GST line-item retention reasoning in the erasure
   logic.

---

## 6. Technical architecture

For the architecture slide, draw three columns and the flows between them.

**Clients**
- Senior app and Family app — React Native 0.86 / **Expo SDK 57**, TypeScript
- Ops console — **Next.js 15**, deployed separately
- Shared `packages/core` — one Supabase client, one set of hooks, so a rule
  cannot drift between the two apps

**Backend — Supabase**
- **Postgres with RLS on every table.** 15 migrations.
- `SECURITY DEFINER` functions for anything that needs to cross a boundary
- **Realtime** for the live SOS queue
- **Storage** with its own policy layer — a private bucket reached only by
  short-lived signed URL
- **6 Edge Functions** (Deno): `sos-trigger`, `sos-escalate`, `calls-token`,
  `razorpay-order`, `razorpay-webhook`, `livestream-reminders`

**Third-party**
- FCM + APNs (push) · Agora (video) · Razorpay (payments) · MSG91 (SMS/WhatsApp)

**The SOS flow — draw this one, it is the money slide**

```
Senior holds SOS
   │
   ├─ capture location
   ▼
sos_events row  ──►  Realtime  ──►  Ops console queue (audible alarm)
   │
   ▼
sos-trigger (Edge Function)
   │
   ├─ FCM  ─────►  family Android  ─┐
   └─ APNs ─────►  family iOS      ─┴─►  FULL-SCREEN alert over lock screen
   │
   ▼
per-recipient delivery recorded  ──►  "family reached: N"
   │
   ▼  (no ack within grace window)
sos-escalate  ──►  SMS / WhatsApp fallback, once per event
```

**Worth calling out on the slide:** the alert is a *data-only background push*,
which is what allows the family app to construct a full-screen alert even when it
has been force-killed. A normal notification cannot do this.

---

## 7. Feasibility and viability

Judges score this section and most teams waste it. Name real risks and real
answers.

| Risk | Why it is real | What we did |
|---|---|---|
| Push fails silently and nobody knows | The single worst failure mode — the family believes they are covered | Per-recipient delivery recorded; SMS escalation; console shows "reached: 0" in red |
| Elderly users cannot complete onboarding | Every senior-tech product dies here | Three text sizes, large targets, plain language, family can pair *and* order on their behalf |
| Health data breach | Regulatory and human catastrophe | RLS as the boundary, encrypted session storage, PII scrubbing before crash reports leave the device, screenshot blocking on health screens, 162 adversarial tests |
| A staff member snoops | The insider case nobody plans for | Health reads impossible without a typed reason; the audit row and the read share a transaction |
| Rate-limit abuse of the SOS path | One senior could spam full-screen alerts to every family device | DB-backed limiter, deliberately fails *open* — a blocked emergency alert is worse than push spam |
| Unlicensed content | A real legal exposure | Licence windows enforced in the read policy; an expired title vanishes with no job to run |
| Partner sells expired stock | Suspension has to actually mean something | Suspending delists from both apps *and* refuses the order at checkout |

**Cost:** the entire stack runs on free tiers for a pilot — Supabase free,
Vercel free, EAS free build tier. Real money starts at Razorpay KYC, SMS credits,
and Agora minutes. That is a genuine advantage to state plainly: a district-level
pilot costs almost nothing to stand up.

**Business model** (say it, hackathons like a sustainability answer):
- Family subscription per senior, monthly
- Commission on marketplace orders — there is a real commission ledger with
  versioned rate cards and two-person payout approval, not a placeholder
- B2B2C: senior-living operators, insurers, hospital chains
- The ops console is the product for those partners, not an afterthought

---

## 8. Impact

- **For the senior:** independence that is not the same as being alone. And
  control — the consent model means using the app does not mean surrendering
  privacy to your children.
- **For the family:** the specific relief of not having to phone three times a
  day to find out nothing.
- **For the health system:** earlier intervention, and a record that exists when
  a doctor needs it.
- **Alignment:** maps onto the National Policy on Older Persons and the AVYAY
  umbrella scheme. **[VERIFY]** the current scheme name and ministry before
  citing — Ministry of Social Justice & Empowerment handles senior citizens.
- **Integration path worth naming as future scope:** the national senior helpline
  **Elderline (14567)** and **108** emergency services as escalation targets, and
  **ABDM / ABHA ID** for health-record interoperability. Label these clearly as
  *not built* — see below.

---

## 9. What is actually built — read this before writing a slide

Be precise here. Overclaiming is how a strong project loses to a weaker honest
one, and a judge who catches one inflated claim discounts everything else.

**Working and tested:**
- All 15 migrations, 162 tests passing
- Consent / permission-grant model
- Health records, vitals, medicines with dose logs
- SOS pipeline server-side, with escalation
- Ops console: 11 modules, mandatory TOTP, 10 RBAC roles, audited health reads
- DPDP export and erasure with two-person approval
- Partner onboarding, commission rate cards, payout runs
- Remote kill switches: force-upgrade, maintenance mode, feature flags
- Both apps typecheck clean and pass 21/21 `expo-doctor`

**Built but not yet verified on a real device** — say "implemented, pending
device testing", never "working":
- The full-screen SOS alert from a force-killed app. This is the one flow that
  can only be confirmed on real hardware, and it is not confirmed yet.
- Video calling end-to-end (needs Agora credentials)
- Payments end-to-end (needs Razorpay KYC)

**Deliberately not built — say so, it is a strength:**
- Content library is empty: no licensing deal exists, and a licensed catalogue
  needs Widevine/FairPlay DRM, which is a paid contractual requirement
- QR-code pairing (typing the code works)
- Elderline / 108 / ABDM integrations
- Storage-file deletion on erasure is currently a documented two-step manual
  process

**Do not claim:** live users, hospital partnerships, clinical validation, or that
the store listings exist.

---

## 10. The demo

Two minutes, one narrative. Do not tour the menus.

1. **Meera opens the app.** Show the text-size control. One sentence: this app
   was designed for someone who reads at arm's length.
2. **She shares one thing.** Grant "readings" to Anil. Show the family app now
   sees vitals — **and nothing else**. This is the moment that lands: open the
   reports tab and show it is empty because she did not share it.
3. **She holds SOS.** Family phone lights up over the lock screen.
4. **Cut to the ops console.** The event is already in the queue. Show "family
   reached: 2". Have an operator try to open her health record — and show it
   demanding a typed reason before it will.
5. **Show the audit trail** with that read in it, named.

That last beat is the one nobody else will have.

**If the live SOS is not device-verified by demo day, record it in advance and
say it is a recording.** A judge who catches a staged live demo is finished with
you. A judge told "this is a recording, here is why" is not.

---

## 11. Questions you will get

**"What if the phone has no internet?"**
The SMS/WhatsApp escalation path is exactly this case — it does not need the
family app or the family's data connection. The senior's own phone does need
connectivity to raise the alert; a cellular-fallback SOS is honest future scope.

**"How is this different from a panic button?"**
A panic button ends at the alert. Vayoo starts there — who was reached, who
acknowledged, what the operator did, what the senior's medicines are, and who is
allowed to see them.

**"Why should a senior trust you with health data?"**
Because they decide what is shared, per category, and can withdraw it instantly;
because staff physically cannot read it without leaving a reason on the record;
and because there are 162 tests whose job is to attack that boundary. Offer to
show the test suite running — very few teams can.

**"Is any of this actually working?"**
Yes, and be exact about which parts. Then volunteer what is not. Section 9.

**"What stops a family member from abusing access?"**
Granted access is per-category, revocable, and visible to the senior. Ordering on
someone's behalf requires a separate `manage` grant, and the order records all
three actors, so who spent the money is never ambiguous.

**"Scale?"**
Postgres with indexed access paths, stateless Edge Functions, push fan-out that
is already batched per platform. The honest constraint is not the database — it
is human: the ops queue needs staffing, which is why the console has shift
handover in it.

---

## 12. Mapping to the standard SIH deck

The usual six-slide idea format, and what to put on each. Adjust once you have
your reference template.

| Slide | Content |
|---|---|
| **1. Idea / Title** | The one-liner from §1. One diagram: two phones + a console. Nothing else. |
| **2. Proposed Solution** | The four pillars (§4), one line each. Lead with emergency, end with dignity. |
| **3. Technical Approach** | The stack (§6) and the SOS flow diagram. Say "RLS is the security boundary" out loud. |
| **4. Feasibility & Viability** | The risk table (§7). Include the free-tier cost point and the business model. |
| **5. Impact & Benefits** | §8. Three beneficiaries, then policy alignment. |
| **6. Research & References** | Your **[VERIFY]** citations: UNFPA India Ageing Report 2023, Census 2011, LASI/IIPS, Telemedicine Practice Guidelines 2020, DPDP Act 2023. |

**If you get a "current status" or "prototype" slide, use §9 verbatim.** The
split between built / pending-device-test / deliberately-not-built is the most
persuasive slide in this deck, precisely because nobody else will draw it.

---

## 13. Naming

`Vayoo` is a genuinely good name for this competition — it reads off *vaya*
(वय, "age") and sits next to the government's own AVYAY umbrella scheme for
senior citizens. Say that in one line on the title slide or in the first ten
seconds of the pitch; a name a judge can decode is a name they remember.

The mobile mockups still carry the earlier working name in a few places. Either
re-export them with Vayoo branding, or say plainly that the prototype was built
under a working name — do not leave a judge to notice it unprompted.
