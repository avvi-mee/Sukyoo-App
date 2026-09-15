'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type VitalType = 'blood_pressure' | 'blood_sugar' | 'spo2';

export function VitalsForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [vitalType, setVitalType] = useState<VitalType>('blood_pressure');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const readingValues =
      vitalType === 'blood_pressure' ? { systolic: Number(systolic), diastolic: Number(diastolic) } : { value: Number(value) };

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from('vitals_readings')
      .insert({ owner_id: userId, recorded_by: userId, vital_type: vitalType, reading_values: readingValues });

    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSystolic('');
    setDiastolic('');
    setValue('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-xl border border-[--color-line] bg-[--color-surface] p-4">
      <label className="block text-sm font-semibold">Log a reading</label>
      <select
        value={vitalType}
        onChange={(e) => setVitalType(e.target.value as VitalType)}
        className="mt-2 w-full rounded-md border border-[--color-line] px-3 py-2 text-sm"
      >
        <option value="blood_pressure">Blood pressure</option>
        <option value="blood_sugar">Blood sugar</option>
        <option value="spo2">Oxygen (SpO2)</option>
      </select>

      {vitalType === 'blood_pressure' ? (
        <div className="mt-2 flex gap-2">
          <input
            required
            inputMode="numeric"
            placeholder="Systolic"
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            className="w-1/2 rounded-md border border-[--color-line] px-3 py-2 text-sm"
          />
          <input
            required
            inputMode="numeric"
            placeholder="Diastolic"
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            className="w-1/2 rounded-md border border-[--color-line] px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <input
          required
          inputMode="numeric"
          placeholder={vitalType === 'blood_sugar' ? 'mg/dL' : '%'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-2 w-full rounded-md border border-[--color-line] px-3 py-2 text-sm"
        />
      )}

      {error ? <p className="mt-2 text-sm text-[--color-red]">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-3 w-full rounded-md bg-[--color-coral] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save reading'}
      </button>
    </form>
  );
}
