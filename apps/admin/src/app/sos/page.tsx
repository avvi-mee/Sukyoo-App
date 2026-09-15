import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';
import { Shell } from '../../components/Shell';
import { SosQueue, type SosRow } from './SosQueue';
import { can } from '../../lib/permissions';

export const dynamic = 'force-dynamic';

export default async function SosPage() {
  const staff = await requirePermission('sos.read');
  const supabase = await createClient();

  // Open events first, then anything closed in the last 24h so a shift handover
  // can see what just happened rather than only what's still burning.
  const { data: events } = await supabase
    .from('sos_events')
    .select(
      `id, senior_id, status, latitude, longitude, triggered_at, resolved_at,
       senior:profiles!sos_events_senior_id_fkey(full_name, phone),
       sos_notifications(id, recipient_id, channel, status, sent_at, acked_at),
       care_dispatch(id, dispatch_status, eta_minutes, notes, created_at)`
    )
    .order('triggered_at', { ascending: false })
    .limit(100);

  const rows = (events ?? []) as unknown as SosRow[];
  const open = rows.filter((e) => e.status === 'triggered' || e.status === 'acked');
  const recent = rows.filter((e) => e.status !== 'triggered' && e.status !== 'acked').slice(0, 25);

  return (
    <Shell staff={staff}>
      <header className="mb-6">
        <h1 className="text-xl font-bold">SOS queue</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          Live. New events appear without a refresh, with an audible alert.
        </p>
      </header>

      <SosQueue
        initialOpen={open}
        recent={recent}
        canManage={can(staff, 'sos.manage')}
        canReadHealth={can(staff, 'user.read_health')}
      />
    </Shell>
  );
}
