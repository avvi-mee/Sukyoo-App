import { requireProfile } from '@/lib/auth';
import { getLinkedSeniors } from '../_components/getLinkedSeniors';
import { RevokeLinkButton } from './RevokeLinkButton';

export default async function FamilySettingsPage() {
  const profile = await requireProfile();
  const seniors = await getLinkedSeniors(profile.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-extrabold">Settings</h1>

      <div className="rounded-2xl border border-[--color-line] bg-[--color-surface] p-5">
        <p className="font-bold">{profile.fullName}</p>
        <p className="text-sm text-[--color-ink-muted]">{profile.phone ?? 'No phone on file'}</p>
      </div>

      <div>
        <h2 className="font-bold">Linked seniors</h2>
        {seniors.length === 0 ? (
          <p className="mt-2 text-sm text-[--color-ink-muted]">Not linked to anyone yet.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {seniors.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[--color-line] bg-[--color-surface] p-4"
              >
                <div>
                  <p className="font-semibold">{s.fullName ?? 'Senior'}</p>
                  <p className="text-xs text-[--color-ink-muted]">{s.relationshipType ?? 'Family'}</p>
                </div>
                <RevokeLinkButton linkId={s.id} seniorName={s.fullName ?? 'them'} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
