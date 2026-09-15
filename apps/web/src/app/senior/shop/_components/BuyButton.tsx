'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function BuyButton({ productId, userId }: { productId: string; userId: string }) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setStatus('idle');
    const supabase = createClient();
    const { error } = await supabase.rpc('create_order', {
      p_belongs_to_user_id: userId,
      p_items: [{ product_id: productId, quantity: qty }],
    });
    setBusy(false);
    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }
    setStatus('ok');
    setMessage('Order placed — payment happens in the Sukyoo app for now.');
  }

  if (status === 'ok') return <p className="text-sm font-semibold text-[--color-green]">{message}</p>;

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
        className="w-14 rounded-md border border-[--color-line] px-2 py-1.5 text-sm"
      />
      <button
        onClick={handleClick}
        disabled={busy}
        className="rounded-md bg-[--color-green] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Placing…' : 'Order'}
      </button>
      {status === 'error' ? <p className="text-xs text-[--color-red]">{message}</p> : null}
    </div>
  );
}
