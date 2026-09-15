import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getLinkedSeniors } from '../_components/getLinkedSeniors';
import { SeniorSwitcher } from '../_components/SeniorSwitcher';
import { isNotAuthorized } from '../_components/notAuthorized';

type Row = Record<string, unknown>;
type SharedRpc = 'get_vitals' | 'get_medications' | 'get_health_records' | 'get_insurance_claims';

async function fetchShared(rpc: SharedRpc, ownerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(rpc, { p_owner_id: ownerId });
  if (error) {
    if (isNotAuthorized(error.message)) return { rows: null as Row[] | null, shared: false };
    return { rows: [] as Row[], shared: true, failed: true };
  }
  return { rows: (data ?? []) as Row[], shared: true };
}

function Section({ title, result }: { title: string; result: { rows: Row[] | null; shared: boolean; failed?: boolean } }) {
  return (
    <div className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
      <h2 className="font-bold">{title}</h2>
      {!result.shared ? (
        <p className="mt-2 text-sm text-(--color-ink-muted)">Not shared with you yet.</p>
      ) : result.failed ? (
        <p className="mt-2 text-sm text-(--color-ink-muted)">Couldn&apos;t load this right now.</p>
      ) : result.rows!.length === 0 ? (
        <p className="mt-2 text-sm text-(--color-ink-muted)">Nothing here yet.</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {result.rows!.map((row, i) => (
            <li key={(row.id as string) ?? i} className="rounded-lg bg-(--color-bg) px-3 py-2">
              {Object.entries(row)
                .filter(([k]) => !['id', 'owner_id'].includes(k))
                .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                .join(' · ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function SharedRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ senior?: string }>;
}) {
  const profile = await requireProfile();
  const seniors = await getLinkedSeniors(profile.id);
  const { senior: seniorParam } = await searchParams;
  const selected = seniors.find((s) => s.seniorId === seniorParam) ?? seniors[0];

  if (!selected) {
    return <p className="text-sm text-(--color-ink-muted)">Link a senior first to see shared records here.</p>;
  }

  const [vitals, medications, healthRecords, insuranceClaims] = await Promise.all([
    fetchShared('get_vitals', selected.seniorId),
    fetchShared('get_medications', selected.seniorId),
    fetchShared('get_health_records', selected.seniorId),
    fetchShared('get_insurance_claims', selected.seniorId),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-extrabold">{selected.fullName ?? 'Senior'}&apos;s shared records</h1>
      <SeniorSwitcher seniors={seniors} selectedId={selected.seniorId} basePath="/family/records" />

      <Section title="Vitals" result={vitals} />
      <Section title="Medications" result={medications} />
      <Section title="Health records" result={healthRecords} />
      <Section title="Insurance claims" result={insuranceClaims} />
    </div>
  );
}
