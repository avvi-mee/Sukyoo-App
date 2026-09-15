'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function Recorder({ userId }: { userId: string }) {
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError('Could not access your microphone. Check your browser permissions.');
    }
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder) return;

    const blob: Blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: 'audio/webm' }));
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    });
    setRecording(false);

    if (!title.trim()) {
      setError('Give your recording a title first.');
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const path = `${userId}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage.from('life-stories').upload(path, blob);
    if (uploadError) {
      setBusy(false);
      setError(uploadError.message);
      return;
    }
    const { error: insertError } = await supabase
      .from('life_story_entries')
      .insert({ owner_id: userId, title, entry_type: 'audio', storage_path: path });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setTitle('');
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-(--color-line) bg-(--color-surface) p-4">
      <label className="block text-sm font-semibold">Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. How I met your grandmother"
        className="mt-1 w-full rounded-md border border-(--color-line) px-3 py-2 text-sm"
      />

      {error ? <p className="mt-2 text-sm text-(--color-red)">{error}</p> : null}

      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={busy}
        className={`mt-3 w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
          recording ? 'bg-(--color-red)' : 'bg-(--color-ink)'
        }`}
      >
        {busy ? 'Saving…' : recording ? 'Stop and save' : 'Start recording'}
      </button>
    </div>
  );
}
