import { notFound } from 'next/navigation';
import { requirePermission } from '../../../lib/auth';
import { createClient } from '../../../lib/supabase/server';
import { Shell } from '../../../components/Shell';
import { can } from '../../../lib/permissions';
import { HealthRecordViewer } from './HealthRecordViewer';

export const dynamic = 'force-dynamic';

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission('user.read');
  const { id } = await params;
  const supabase = await createClient();

  const { data: person } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, date_of_birth, pincode, created_at')
    .eq('id', id)
    .maybeSingle();

  if (!person) notFound();

  const [{ data: links }, { data: sos }, { data: orders }] = await Promise.all([
    supabase
      .from('family_links')
      .select(
        `id, status, relationship_type,
         family_member:profiles!family_links_family_member_id_fkey(full_name),
         permission_grants(resource_type, revoked_at)`
      )
      .eq('senior_id', id),
    supabase
      .from('sos_events')
      .select('id, status, triggered_at')
      .eq('senior_id', id)
      .order('triggered_at', { ascending: false })
      .limit(10),
    can(staff, 'finance.read')
      ? supabase
          .from('orders')
          .select('id, status, subtotal, created_at')
          .eq('belongs_to_user_id', id)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: null }),
  ]);

  return (
    <Shell staff={staff}>
      <header className="mb-6">
        <h1 className="text-xl font-bold">{person.full_name ?? 'Unnamed person'}</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          {person.role} · joined {new Date(person.created_at).toLocaleDateString('en-IN')}
          {person.phone ? (
            <>
              {' · '}
              <a href={`tel:${person.phone}`} className="text-[--color-brand] underline">
                {person.phone}
              </a>
            </>
          ) : null}
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">Linked family</h2>
        {!links?.length ? (
          <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-5 text-sm text-[--color-ink-muted]">
            Nobody is linked. This person has no one to receive an SOS alert.
          </p>
        ) : (
          <ul className="divide-y divide-[--color-line] rounded-lg border border-[--color-line] bg-[--color-surface]">
            {links.map((link: any) => {
              const live = (link.permission_grants ?? []).filter((g: any) => !g.revoked_at);
              return (
                <li key={link.id} className="px-4 py-3 text-sm">
                  <span className="font-medium">{link.family_member?.full_name ?? '—'}</span>
                  {link.relationship_type ? (
                    <span className="text-[--color-ink-muted]"> ({link.relationship_type})</span>
                  ) : null}
                  <span className="text-[--color-ink-muted]"> · {link.status}</span>
                  <span className="block text-xs text-[--color-ink-muted]">
                    {live.length ? `Shared: ${live.map((g: any) => g.resource_type).join(', ')}` : 'Nothing shared'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">SOS history</h2>
        {!sos?.length ? (
          <p className="text-sm text-[--color-ink-muted]">No SOS events.</p>
        ) : (
          <ul className="divide-y divide-[--color-line] rounded-lg border border-[--color-line] bg-[--color-surface]">
            {sos.map((event) => (
              <li key={event.id} className="flex justify-between px-4 py-3 text-sm">
                <span>{new Date(event.triggered_at).toLocaleString('en-IN')}</span>
                <span className="text-[--color-ink-muted]">{event.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {orders ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">Recent orders</h2>
          {!orders.length ? (
            <p className="text-sm text-[--color-ink-muted]">No orders.</p>
          ) : (
            <ul className="divide-y divide-[--color-line] rounded-lg border border-[--color-line] bg-[--color-surface]">
              {orders.map((order) => (
                <li key={order.id} className="flex justify-between px-4 py-3 text-sm">
                  <span>{new Date(order.created_at).toLocaleDateString('en-IN')}</span>
                  <span className="tabular-nums">
                    ₹{Number(order.subtotal).toLocaleString('en-IN')} · {order.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-ink-muted]">Health records</h2>
        {can(staff, 'user.read_health') ? (
          <HealthRecordViewer ownerId={person.id} personName={person.full_name ?? 'this person'} />
        ) : (
          <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-5 text-sm text-[--color-ink-muted]">
            Your roles do not include access to health data.
          </p>
        )}
      </section>
    </Shell>
  );
}
