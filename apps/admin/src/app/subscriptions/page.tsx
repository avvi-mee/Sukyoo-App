import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';
import { Shell } from '../../components/Shell';

export const dynamic = 'force-dynamic';

type SubRow = {
  user_id: string;
  product_id: string;
  is_active: boolean;
  user: { full_name: string | null } | null;
  product: { name: string; price: number } | null;
};

type OrderRow = {
  id: string;
  status: string;
  subtotal: number;
  created_at: string;
  ordered_by_role: string;
  belongs_to: { full_name: string | null } | null;
  ordered_by: { full_name: string | null } | null;
  payments: { status: string; razorpay_payment_id: string | null }[];
};

export default async function SubscriptionsPage() {
  const staff = await requirePermission('finance.read');
  const supabase = await createClient();

  const [{ data: subs }, { data: orders }] = await Promise.all([
    supabase
      .from('product_subscriptions')
      .select(`user_id, product_id, is_active,
               user:profiles!product_subscriptions_user_id_fkey(full_name),
               product:products(name, price)`)
      .eq('is_active', true)
      .limit(200),
    supabase
      .from('orders')
      .select(`id, status, subtotal, created_at, ordered_by_role,
               belongs_to:profiles!orders_belongs_to_user_id_fkey(full_name),
               ordered_by:profiles!orders_ordered_by_user_id_fkey(full_name),
               payments(status, razorpay_payment_id)`)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const subscriptions = (subs ?? []) as unknown as SubRow[];
  const recentOrders = (orders ?? []) as unknown as OrderRow[];

  // A pending order with a captured payment, or vice versa, is the shape of a
  // webhook that didn't land. Surfacing it here is cheaper than a reconciliation
  // script nobody runs.
  const mismatched = recentOrders.filter((o) => {
    const captured = o.payments.some((p) => p.status === 'captured');
    return (captured && o.status !== 'paid') || (!captured && o.status === 'paid');
  });

  const monthlyValue = subscriptions.reduce((sum, s) => sum + Number(s.product?.price ?? 0), 0);

  return (
    <Shell staff={staff}>
      <header className="mb-6">
        <h1 className="text-xl font-bold">Subscriptions &amp; orders</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          Auto-reorder subscriptions and recent order activity.
        </p>
      </header>

      {mismatched.length > 0 ? (
        <div className="mb-6 rounded-lg border border-[--color-danger] bg-[--color-danger-tint] p-4">
          <p className="text-sm font-bold text-[--color-danger]">
            {mismatched.length} order{mismatched.length === 1 ? '' : 's'} disagree with their payment record
          </p>
          <p className="mt-1 text-sm text-[--color-danger]">
            An order marked paid with no captured payment (or the reverse) usually means the Razorpay webhook did not
            reach us. Check the webhook configuration before refunding anything.
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-[--color-danger]">
            {mismatched.slice(0, 10).map((o) => (
              <li key={o.id} className="font-mono">
                {o.id} — order &ldquo;{o.status}&rdquo;, payment &ldquo;{o.payments[0]?.status ?? 'none'}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Active subscriptions" value={String(subscriptions.length)} />
        <Stat label="Recurring value per cycle" value={`₹${monthlyValue.toLocaleString('en-IN')}`} />
        <Stat
          label="Orders awaiting payment"
          value={String(recentOrders.filter((o) => o.status === 'pending').length)}
        />
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
        Active subscriptions
      </h2>
      {subscriptions.length === 0 ? (
        <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-6 text-sm text-[--color-ink-muted]">
          Nobody has an active auto-reorder yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[--color-line] bg-[--color-surface]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-line] text-left text-xs uppercase tracking-wide text-[--color-ink-muted]">
              <tr>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-line]">
              {subscriptions.map((s) => (
                <tr key={`${s.user_id}-${s.product_id}`}>
                  <td className="px-4 py-3 font-medium">{s.user?.full_name ?? '—'}</td>
                  <td className="px-4 py-3">{s.product?.name ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums">
                    ₹{Number(s.product?.price ?? 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">
        Recent orders
      </h2>
      {recentOrders.length === 0 ? (
        <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-6 text-sm text-[--color-ink-muted]">
          No orders yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[--color-line] bg-[--color-surface]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-line] text-left text-xs uppercase tracking-wide text-[--color-ink-muted]">
              <tr>
                <th className="px-4 py-3">For</th>
                <th className="px-4 py-3">Placed by</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-line]">
              {recentOrders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium">{o.belongs_to?.full_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {o.ordered_by?.full_name ?? '—'}
                    {/* The three-actor model is the point of this table: who it's
                        for, who placed it, and who paid can all differ. */}
                    <span className="text-[--color-ink-muted]"> ({o.ordered_by_role})</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">₹{Number(o.subtotal).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">{o.status}</td>
                  <td className="px-4 py-3">{o.payments[0]?.status ?? 'none'}</td>
                  <td className="px-4 py-3 text-[--color-ink-muted]">
                    {new Date(o.created_at).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
