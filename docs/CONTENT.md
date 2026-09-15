# Content, livestreams and moderation (Phase 4B)

Built 2026-08-18. Migration `20260818150000_content_and_livestreams.sql`,
console at `/content` and `/livestreams`, tests in `supabase/tests/content.test.mjs`.

---

## The licence window is the whole point

Before this migration, `content_items` was a bare catalogue with an RLS policy of
`using (true)`. Nothing recorded who licensed a title, for which territory, or
until when — and nothing made an expired title disappear.

For a product whose entire content vertical is blocked on licensing deals, that
is the wrong design. An expiry that depends on somebody remembering is not an
expiry. So the rule lives in the read path:

```sql
create policy "content_items_select_licensed" on public.content_items
  for select using (
    (publish_status = 'published'
      and licensed_from is not null
      and licensed_from <= current_date
      and (licensed_until is null or licensed_until >= current_date)
      and territory in ('IN', 'WORLD'))
    or public.staff_has_permission('content.read')
  );
```

A window that closes at midnight removes the title from both apps at midnight.
There is no sweep job to run, no cron to forget, and no deploy to ship.

### One deliberate asymmetry

- **`licensed_until IS NULL` means perpetual.** Some devotional and public-domain
  material genuinely has no end date.
- **`licensed_from IS NULL` does *not* mean "available since forever".** It means
  nobody filled the form in, so the title stays hidden.

That asymmetry is the safe direction on both sides. The dangerous default would
be treating a blank start date as open — an operator creating a row, publishing
it, and never entering the licence date is exactly how unlicensed content ships.
`setPublishStatus()` in the console refuses to publish without a start date, a
licensor and a media URL, and explains why rather than just greying out a button.

### Territory

`territory` defaults to `'IN'` and only `'IN'` or `'WORLD'` are readable. A title
licensed for `'US'` stays hidden here even with open dates. The console lists any
published-but-invisible title with the specific reason, because
*"why can't my mother see the film"* should not require reading SQL.

---

## What a real catalogue additionally requires

**No paid video provider is wired, on purpose.** Comparing Mux, Cloudflare Stream
and Bunny on India egress is premature while there is no catalogue to serve, and
the schema does not depend on which one wins.

What exists instead is a `VideoProvider` interface in
`packages/core/src/api/livestreams.ts` with one implementation,
`directUrlProvider`, which plays back whatever URL is stored — unsigned and
unprotected. That is fine for a public devotional stream or a self-hosted test
clip. It is explicitly **not** acceptable for licensed content, and it reports
`requiresDrm: false` honestly rather than pretending to protect anything.

The interface exists now rather than later so screens ask for a playable URL
instead of constructing one; swapping in a real provider stays a one-file change.

**A licensed commercial film catalogue requires DRM — Widevine on Android,
FairPlay on iOS.** This is a contractual term from licensors, not a technical
preference, and it means:

- A paid provider tier (DRM is not on any free plan).
- A licence server, and key delivery on both platforms.
- Signed HLS URLs are **not** DRM. No licensor accepts them as a substitute.
  A signed URL restricts *who can fetch* the file; DRM restricts *what a device
  can do* with it after fetching. They solve different problems.

Until a deal is signed, both apps show an honest "opening soon" state. The
console's empty library says the same thing, because seeding placeholder film
titles would imply rights Sukyoo does not hold.

---

## Livestreams

Two tables. `livestream_series` holds a recurring definition; `livestreams` holds
one row per actual broadcast. A one-off is a `livestreams` row with a null
`series_id`, so scheduling something once does not require inventing a series.

### The RRULE subset

`generate_livestream_occurrences()` understands `FREQ=DAILY|WEEKLY`, `INTERVAL`,
`BYDAY`, `UNTIL` and `COUNT`. That covers every schedule a livestream programme
actually has — *"every Tuesday and Friday at 18:00 until March"*.

`FREQ=MONTHLY`, `BYSETPOS` and `BYMONTHDAY` **raise** rather than silently
generating the wrong dates. An unsupported rule that quietly produced daily
occurrences would be far worse than an error. The stored column holds a full
RRULE string, so extending the generator needs no data migration.

Generation is **idempotent** — a unique index on `(series_id, starts_at)` plus
`on conflict do nothing`, so re-running never duplicates the calendar. The index
is deliberately *not* partial: Postgres cannot infer a partial index in
`ON CONFLICT` unless the statement repeats the predicate, and the generator
relies on that inference.

### The state machine

```
scheduled ──> live ──> ended ──> archived
    └──> cancelled
```

Transitions are explicit, not "any status to any status":

- `ended → live` would resurrect a broadcast viewers have already left.
- `scheduled → archived` would skip the recording capture.
- `cancelled` is reachable from `scheduled` only. Pulling a broadcast already on
  air is a **kill**, not a cancellation, and the two must be distinguishable
  afterwards.

Three guards worth knowing:

- **No playback URL, no going live.** Taking a stream live with nothing behind it
  puts a black rectangle in front of a senior who was told to expect a broadcast.
- **Ending before `ends_at` needs a reason of 10+ characters.** That is the kill
  switch. Requiring it in the RPC rather than the UI means the record exists
  however the stream was pulled. Ending on or after `ends_at` is just a broadcast
  finishing, so it does not.
- **Cancelling or ending deletes unsent reminders in the same transaction.** A
  "starting now" push for a cancelled broadcast is the single worst notification
  this system could send.

`viewer_count` is zeroed on any transition out of `live`. A stale count on an
ended broadcast is how an ops dashboard starts lying.

### Reminders

Reminders are **rows**, not a cron expression, so "was this sent?" has an answer
and a re-run cannot double-send. Three per broadcast — T-24h, T-1h, and at the
start — and any whose moment has already passed is **never created**, so
scheduling a stream for an hour from now does not retroactively fire "tomorrow".

`supabase/functions/livestream-reminders` sweeps due rows. It **claims each row
before sending** (`update … where sent_at is null` returning rows), which makes
two overlapping cron invocations safe. If a push half-fails the reminder is
dropped rather than retried: an elderly user receiving the same notification
twelve times is worse than receiving it once late, and there is another reminder
behind it.

Only people who **registered interest** are notified. Pushing every broadcast to
every senior would be marketing, and marketing that ignores opt-out is how an app
that also sends emergency alerts gets its notifications muted at the OS level.
Un-registering deletes the row rather than setting a suppressed flag.

The in-app `notifications` row is written regardless of push delivery, so someone
with notifications off still sees it next time they open the app.

Deploy needs a `REMINDERS_SECRET` function secret and the cron entry at the
bottom of that file.

---

## Moderation

`content_reports` is generic on purpose: a report names a `resource_type` and a
`resource_id` rather than being tied to one content type, because the surfaces
that can go wrong — a livestream, a mis-categorised film, a distressing shared
recording — do not share a table.

Both write paths are RPCs, and there is **no INSERT or UPDATE policy for anyone**:

- `report_content()` is callable by any signed-in user. This is the one path from
  a senior's screen into the ops queue; gating it on anything more would mean
  someone seeing something distressing has no way to say so. It takes the
  reporter from `auth.uid()`, so a report cannot be filed in someone else's name.
- `resolve_content_report()` needs `content.manage` and a resolution note of 10+
  characters, and only acts on an **open** report — resolving twice raises, so a
  second operator learns somebody got there first rather than silently
  overwriting them.

A reporter sees their own report and its outcome. They cannot see anyone else's:
*"three other people reported this"* is information about those people.

Re-reporting the same thing refreshes the detail and reopens it rather than
failing. From the senior's side the button worked either way, which is the
behaviour that matters — and a queue that double-counts a double tap hides the
real volume.

**In the senior app**, `LivestreamsScreen` carries the report control on every
card, live or not, in plain words rather than moderation jargon: *"It won't play"*,
*"It upset me"*, *"It shouldn't be here"*, *"Something is wrong with it"*.
Distressing and inappropriate reports sort to the top of the ops queue regardless
of when they arrived — safeguarding is a different kind of problem from a broken
audio track, and a queue sorted only by time buries it.

---

## Verifying

```bash
npm test          # includes 26 assertions for this migration
npm run typecheck
```

Worth checking by hand against a real project, because the harness cannot:

1. Publish a title with `licensed_until` set to yesterday and confirm a senior
   account gets zero rows — the automated test proves the policy, not the
   deployed configuration.
2. Schedule a broadcast an hour out, register a senior account, and confirm the
   "starting now" reminder arrives on a real device.
3. Pull that broadcast off air and confirm the reminder does **not** arrive.
