import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { PermissionResourceType } from '@sukyoo/core';
import { VitalsForm } from './_components/VitalsForm';
import { DoseButton } from './_components/DoseButton';
import { PermissionRow } from './_components/PermissionRow';
import { GenerateInviteButton } from './_components/GenerateInviteButton';

const RESOURCE_TYPES: { type: PermissionResourceType; label: string; allowManageChoice?: boolean }[] = [
  { type: 'vitals', label: 'Vitals & readings' },
  { type: 'medication', label: 'Medications' },
  { type: 'health_record', label: 'Health records' },
  { type: 'insurance_policy', label: 'Insurance policy' },
  { type: 'insurance_claim', label: 'Insurance claims' },
  { type: 'order', label: 'Orders — let them place orders for you', allowManageChoice: true },
  { type: 'life_story_entry', label: 'Life stories' },
];

function formatVital(vitalType: string, values: Record<string, number>) {
  if (vitalType === 'blood_pressure') return `${values.systolic}/${values.diastolic} mmHg`;
  if (vitalType === 'blood_sugar') return `${values.value} mg/dL`;
  return `${values.value}%`;
}

export default async function HealthPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: vitals }, { data: medications }, { data: doses }, { data: familyLinks }] = await Promise.all([
    supabase.from('vitals_readings').select('*').eq('owner_id', profile.id).order('recorded_at', { ascending: false }).limit(10),
    supabase.from('medications').select('*').eq('owner_id', profile.id).eq('is_active', true).order('created_at'),
    supabase.rpc('ensure_todays_doses', { p_owner_id: profile.id }),
    supabase
      .from('family_links')
      .select('id, family_member:profiles!family_links_family_member_id_fkey(full_name)')
      .eq('senior_id', profile.id)
      .eq('status', 'active'),
  ]);

  const linkIds = (familyLinks ?? []).map((l) => l.id);
  const { data: grants } = linkIds.length
    ? await supabase.from('permission_grants').select('*').in('family_link_id', linkIds).is('revoked_at', null)
    : { data: [] as { id: string; family_link_id: string; resource_type: PermissionResourceType; access_level: 'view' | 'manage' }[] };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Health</h1>
        <p className="mt-1 text-(--color-ink-muted)">Vitals, medicines, doctors and who can see them.</p>
      </div>

      <section className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
        <h2 className="text-lg font-bold">Vitals</h2>
        <ul className="mt-3 space-y-2">
          {(vitals ?? []).map((v) => (
            <li key={v.id} className="flex items-center justify-between text-sm">
              <span className="capitalize">{v.vital_type.replace('_', ' ')}</span>
              <span className="font-semibold">{formatVital(v.vital_type, v.reading_values as Record<string, number>)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  v.status === 'high' ? 'bg-(--color-red-tint) text-(--color-red)' : v.status === 'low' ? 'bg-(--color-amber-tint) text-(--color-amber)' : 'bg-(--color-green-tint) text-(--color-green)'
                }`}
              >
                {v.status}
              </span>
            </li>
          ))}
          {!vitals?.length ? <p className="text-sm text-(--color-ink-muted)">No readings yet.</p> : null}
        </ul>
        <VitalsForm userId={profile.id} />
      </section>

      <section className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
        <h2 className="text-lg font-bold">Medications</h2>
        {(medications ?? []).map((m) => (
          <p key={m.id} className="mt-2 text-sm font-semibold">
            {m.name} {m.dosage ? <span className="font-normal text-(--color-ink-muted)">— {m.dosage}</span> : null}
          </p>
        ))}
        {!medications?.length ? <p className="mt-2 text-sm text-(--color-ink-muted)">No active medications.</p> : null}

        <h3 className="mt-4 text-sm font-semibold text-(--color-ink-muted)">Today&apos;s doses</h3>
        <ul className="mt-2 space-y-2">
          {(doses ?? []).map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-md border border-(--color-line) px-3 py-2 text-sm">
              <span>{new Date(d.scheduled_for).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              {d.status === 'taken' ? (
                <span className="font-semibold text-(--color-green)">Taken</span>
              ) : (
                <DoseButton doseLogId={d.id} />
              )}
            </li>
          ))}
          {!doses?.length ? <p className="text-sm text-(--color-ink-muted)">Nothing scheduled today.</p> : null}
        </ul>
      </section>

      <section className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
        <h2 className="text-lg font-bold">Doctors</h2>
        <p className="mt-1 text-sm text-(--color-ink-muted)">Browse and book a consultation.</p>
        <Link
          href="/senior/health/doctors"
          className="mt-3 inline-block rounded-md bg-(--color-coral) px-4 py-2.5 text-sm font-semibold text-white"
        >
          Find a doctor
        </Link>
      </section>

      <section id="family-sharing" className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
        <h2 className="text-lg font-bold">Family sharing</h2>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Choose what each linked family member can see. Nothing is shared unless you turn it on here.
        </p>

        <div className="mt-4">
          <GenerateInviteButton />
        </div>

        {!familyLinks?.length ? (
          <p className="mt-3 text-sm text-(--color-ink-muted)">
            Nobody is linked yet. Generate a code above and share it with your family member — they enter it in their
            own app or web portal to link.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {familyLinks.map((link) => (
              <div key={link.id}>
                <p className="font-semibold">{link.family_member?.full_name ?? 'Family member'}</p>
                <div className="mt-1">
                  {RESOURCE_TYPES.map((rt) => {
                    const grant = (grants ?? []).find((g) => g.family_link_id === link.id && g.resource_type === rt.type);
                    return (
                      <PermissionRow
                        key={rt.type}
                        familyLinkId={link.id}
                        resourceType={rt.type}
                        label={rt.label}
                        grantId={grant?.id ?? null}
                        accessLevel={grant?.access_level ?? null}
                        allowManageChoice={rt.allowManageChoice}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
