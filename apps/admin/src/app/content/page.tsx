import Link from 'next/link';
import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';
import { Shell } from '../../components/Shell';
import { can } from '../../lib/permissions';
import { daysUntil } from '../../lib/dates';
import { TitleEditor, TitleRow, type Title } from './ContentControls';

export const dynamic = 'force-dynamic';

export default async function ContentPage() {
  const staff = await requirePermission('content.read');
  const supabase = await createClient();

  const [{ data: titles }, { data: openReports }] = await Promise.all([
    supabase
      .from('content_items')
      .select(
        `id, title, category, publish_status, licensor, territory, licensed_from,
         licensed_until, licence_reference, media_url, duration_seconds, content_warning`
      )
      .order('title')
      .limit(500),
    supabase.from('content_reports').select('id').eq('status', 'open'),
  ]);

  const library = (titles ?? []) as Title[];
  const canManage = can(staff, 'content.manage');

  const published = library.filter((t) => t.publish_status === 'published');
  // Live means published AND inside the window AND in territory — the same
  // conditions the catalogue policy checks, so this count is what a senior
  // actually sees rather than what an operator meant.
  const live = published.filter(
    (t) =>
      t.licensed_from &&
      daysUntil(t.licensed_from) <= 0 &&
      (!t.licensed_until || daysUntil(t.licensed_until) >= 0) &&
      ['IN', 'WORLD'].includes(t.territory)
  );
  const expiring = published
    .filter((t) => t.licensed_until)
    .map((t) => ({ t, days: daysUntil(t.licensed_until!) }))
    .filter((r) => r.days <= 60)
    .sort((a, b) => a.days - b.days);
  const lapsed = expiring.filter((r) => r.days < 0);

  // A published row that is not live is the interesting failure: somebody marked
  // it published and it is silently invisible. Naming it beats waiting for
  // "why can't my mother see the film".
  const publishedButInvisible = published.filter((t) => !live.includes(t));

  return (
    <Shell staff={staff}>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Content library</h1>
          <p className="mt-1 text-sm text-[--color-ink-muted]">
            Every title carries its licence window. A window that closes removes the title from both apps on its own
            — there is no sweep job to run and no deploy to ship.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/livestreams" className="text-[--color-brand] underline">
            Livestreams
          </Link>
          <Link href="/content/reports" className="text-[--color-brand] underline">
            Reports{(openReports ?? []).length > 0 ? ` (${(openReports ?? []).length})` : ''}
          </Link>
        </div>
      </header>

      {library.length === 0 ? (
        <div className="mb-6 rounded-lg border border-dashed border-[--color-line] bg-[--color-surface] p-5 text-sm text-[--color-ink-muted]">
          <p className="font-bold text-[--color-ink]">The library is empty, and that is correct.</p>
          <p className="mt-1">
            Nothing is seeded here because no content licensing exists yet. Adding placeholder film titles would
            imply rights Sukyoo does not hold, so both apps show an honest &ldquo;opening soon&rdquo; state instead.
            See <code className="font-mono text-xs">docs/CONTENT.md</code> for what a real catalogue additionally
            requires.
          </p>
        </div>
      ) : null}

      {lapsed.length > 0 ? (
        <div className="mb-6 rounded-lg border border-[--color-danger] bg-[--color-danger-tint] p-4 text-sm text-[--color-danger]">
          <p className="font-bold">
            {lapsed.length} title{lapsed.length === 1 ? '' : 's'} past{' '}
            {lapsed.length === 1 ? 'its' : 'their'} licence window
          </p>
          <p className="mt-1">
            Already hidden from seniors automatically. Withdraw them or renew the licence so the library stops
            carrying rows nobody can watch.
          </p>
          <ul className="mt-2 space-y-0.5">
            {lapsed.map(({ t, days }) => (
              <li key={t.id}>
                {t.title} — ended {Math.abs(days)} day{Math.abs(days) === 1 ? '' : 's'} ago
                {t.licensor ? ` (${t.licensor})` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {publishedButInvisible.length > 0 ? (
        <div className="mb-6 rounded-lg border border-[--color-warn] bg-[--color-warn-tint] p-4 text-sm text-[--color-warn]">
          <p className="font-bold">
            {publishedButInvisible.length} title{publishedButInvisible.length === 1 ? '' : 's'} marked published but
            not visible
          </p>
          <ul className="mt-2 space-y-0.5">
            {publishedButInvisible.map((t) => (
              <li key={t.id}>
                {t.title} —{' '}
                {!t.licensed_from
                  ? 'no licence start date recorded'
                  : daysUntil(t.licensed_from) > 0
                    ? `window opens in ${daysUntil(t.licensed_from)} days`
                    : t.licensed_until && daysUntil(t.licensed_until) < 0
                      ? 'window has closed'
                      : `licensed for ${t.territory} only`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Visible to seniors now" value={String(live.length)} />
        <Stat label="In the library" value={String(library.length)} />
        <Stat
          label="Windows closing in 60 days"
          value={String(expiring.filter((r) => r.days >= 0).length)}
        />
      </div>

      {canManage ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">Add a title</h2>
          <div className="rounded-lg border border-[--color-line] bg-[--color-surface] p-5">
            <TitleEditor />
          </div>
        </section>
      ) : null}

      {library.length > 0 ? (
        <>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">Titles</h2>
          <div className="divide-y divide-[--color-line] rounded-lg border border-[--color-line] bg-[--color-surface]">
            {library.map((t) => (
              <TitleRow key={t.id} title={t} canManage={canManage} />
            ))}
          </div>
        </>
      ) : null}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[--color-line] bg-[--color-surface] p-5">
      <p className="text-sm text-[--color-ink-muted]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
