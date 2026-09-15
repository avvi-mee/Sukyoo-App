import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getLinkedSeniors } from '../_components/getLinkedSeniors';
import { SeniorSwitcher } from '../_components/SeniorSwitcher';
import { isNotAuthorized } from '../_components/notAuthorized';

type LifeStoryEntry = {
  id: string;
  title: string;
  entry_type: string;
  storage_path: string | null;
  body_text: string | null;
  created_at: string;
};

export default async function FamilyStoriesPage({ searchParams }: { searchParams: Promise<{ senior?: string }> }) {
  const profile = await requireProfile();
  const seniors = await getLinkedSeniors(profile.id);
  const { senior: seniorParam } = await searchParams;
  const selected = seniors.find((s) => s.seniorId === seniorParam) ?? seniors[0];

  if (!selected) {
    return <p className="text-sm text-(--color-ink-muted)">Link a senior first to hear their stories.</p>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_life_story_entries', { p_owner_id: selected.seniorId });

  let entries: (LifeStoryEntry & { signedUrl: string | null })[] = [];
  let notShared = false;

  if (error) {
    notShared = isNotAuthorized(error.message);
  } else {
    entries = await Promise.all(
      ((data ?? []) as LifeStoryEntry[]).map(async (entry) => {
        if (!entry.storage_path) return { ...entry, signedUrl: null };
        const { data: signed } = await supabase.storage.from('life-stories').createSignedUrl(entry.storage_path, 120);
        return { ...entry, signedUrl: signed?.signedUrl ?? null };
      })
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-extrabold">{selected.fullName ?? 'Senior'}&apos;s stories</h1>
      <SeniorSwitcher seniors={seniors} selectedId={selected.seniorId} basePath="/family/stories" />

      {notShared ? (
        <p className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-6 text-sm text-(--color-ink-muted)">
          Not shared with you yet.
        </p>
      ) : entries.length === 0 ? (
        <p className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-6 text-sm text-(--color-ink-muted)">
          No stories recorded yet.
        </p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
              <p className="font-bold">{entry.title}</p>
              <p className="text-xs text-(--color-ink-muted)">{new Date(entry.created_at).toLocaleDateString()}</p>
              {entry.body_text ? <p className="mt-2 text-sm">{entry.body_text}</p> : null}
              {entry.signedUrl ? (
                <audio controls src={entry.signedUrl} className="mt-3 w-full">
                  Your browser does not support audio playback.
                </audio>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
