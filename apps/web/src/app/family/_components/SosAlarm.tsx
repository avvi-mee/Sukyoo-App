'use client';

import { useEffect, useRef, useState } from 'react';

// WebAudio, not an <audio src> file: a missing/404'd file fails silently,
// and on this page silence means a missed emergency (same reasoning
// apps/admin's SOS queue documents in docs/ADMIN.md). Browsers also block
// autoplay sound, so the alarm only starts after an explicit user gesture —
// arming it once covers the whole session.
export function SosAlarm({ active }: { active: boolean }) {
  const [armed, setArmed] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);

  function arm() {
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    setArmed(true);
  }

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!armed || !ctx) return;

    if (active && !nodesRef.current) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      nodesRef.current = { osc, gain };
    } else if (!active && nodesRef.current) {
      nodesRef.current.osc.stop();
      nodesRef.current.osc.disconnect();
      nodesRef.current.gain.disconnect();
      nodesRef.current = null;
    }
  }, [active, armed]);

  useEffect(
    () => () => {
      nodesRef.current?.osc.stop();
      ctxRef.current?.close();
    },
    []
  );

  if (!active) return null;

  return armed ? (
    <p className="text-xs text-white/80">Alert sound is on.</p>
  ) : (
    <button
      type="button"
      onClick={arm}
      className="rounded-md border border-white/60 px-3 py-1.5 text-xs font-semibold text-white"
    >
      Enable alert sound
    </button>
  );
}
