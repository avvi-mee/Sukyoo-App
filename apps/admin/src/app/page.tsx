import { requireStaff } from '../lib/auth';
import { createClient } from '../lib/supabase/server';
import { Shell } from '../components/Shell';
import { can } from '../lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * Counts are fetched with `head: true` so only the count crosses the wire, never
 * the rows. Each is RLS-filtered, so a role without the permission sees null and
 * the tile is simply not rendered — no leak, and no empty tile implying access.
 */
async function count(table: string, filter?: (q: any) => any) {
  const supabase = await createClient();
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) query = filter(query);
  const { count: n, error } = await query;
  return error ? null : (n ?? 0);
}

export default async function DashboardPage() {
  const staff = await requireStaff();

  const [openSos, seniors, openOrders] = await Promise.all([
    can(staff, 'sos.read') ? count('sos_events', (q) => q.in('status', ['triggered', 'acked'])) : null,
    can(staff, 'user.read') ? count('profiles', (q) => q.eq('role', 'senior')) : null,
    can(staff, 'finance.read') ? count('orders', (q) => q.eq('status', 'pending')) : null,
  ]);

  return (
    <Shell staff={staff}>
      <header className="mb-6">
        <h1 className="text-xl font-bold">Today</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          Signed in as {staff.email} · {staff.roles.join(', ')}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {openSos !== null ? (
          <Tile
            label="Open SOS events"
            value={openSos}
            href="/sos"
            tone={openSos > 0 ? 'danger' : 'ok'}
          />
        ) : null}
        {seniors !== null ? <Tile label="Seniors" value={seniors} href="/people" /> : null}
        {openOrders !== null ? <Tile label="Orders awaiting payment" value={openOrders} href="/subscriptions" /> : null}
      </div>

      {openSos === null && seniors === null && openOrders === null ? (
        <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-6 text-sm text-[--color-ink-muted]">
          Your roles don&rsquo;t include any dashboard metrics. Use the navigation on the left.
        </p>
      ) : null}
    </Shell>
  );
}

function Tile({
  label,
  value,
  href,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  href: string;
  tone?: 'neutral' | 'danger' | 'ok';
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-[--color-danger] bg-[--color-danger-tint]'
      : tone === 'ok'
        ? 'border-[--color-line] bg-[--color-surface]'
        : 'border-[--color-line] bg-[--color-surface]';

  return (
    <a href={href} className={`block rounded-lg border p-5 ${toneClass}`}>
      <p className="text-sm text-[--color-ink-muted]">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
    </a>
  );
}
