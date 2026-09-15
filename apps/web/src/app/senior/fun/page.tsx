import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Recorder } from './_components/Recorder';

export default async function FunPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from('life_story_entries')
    .select('*')
    .eq('owner_id', profile.id)
    .order('created_at', { ascending: false });

  const withUrls = await Promise.all(
    (entries ?? []).map(async (entry) => {
      if (!entry.storage_path) return { ...entry, url: null as string | null };
      const { data } = await supabase.storage.from('life-stories').createSignedUrl(entry.storage_path, 120);
      return { ...entry, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold">Your stories</h1>
      <p className="mt-1 text-(--color-ink-muted)">Record a memory to share with family, whenever you like.</p>

      <div className="mt-4">
        <Recorder userId={profile.id} />
      </div>

      <div className="mt-6 space-y-3">
        {withUrls.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-(--color-line) bg-(--color-surface) p-4">
            <p className="font-bold">{entry.title}</p>
            <p className="text-xs text-(--color-ink-muted)">{new Date(entry.created_at).toLocaleDateString()}</p>
            {entry.url ? (
              <audio controls src={entry.url} className="mt-2 w-full" />
            ) : (
              <p className="mt-2 text-sm text-(--color-ink-muted)">Not available.</p>
            )}
          </div>
        ))}
        {!withUrls.length ? <p className="text-sm text-(--color-ink-muted)">No stories recorded yet.</p> : null}
      </div>
    </div>
  );
}
