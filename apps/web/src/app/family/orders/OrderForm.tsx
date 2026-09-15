'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Product = { id: string; name: string; price: number; image_url: string | null };

export function OrderForm({ seniorId, seniorName, products }: { seniorId: string; seniorName: string; products: Product[] }) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);

  async function handleSend(productId: string) {
    setBusy(productId);
    setError(null);
    setPlaced(null);

    const supabase = createClient();
    const quantity = quantities[productId] ?? 1;
    const { error: rpcError } = await supabase.rpc('create_order', {
      p_belongs_to_user_id: seniorId,
      p_items: [{ product_id: productId, quantity }],
    });

    setBusy(null);
    if (rpcError) {
      setError(
        rpcError.message.toLowerCase().includes('not authorized')
          ? `Ask ${seniorName} to turn on order management for you in their Family sharing settings.`
          : "Couldn't place that order right now."
      );
      return;
    }

    setPlaced(productId);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-md bg-(--color-red-tint) px-3 py-2 text-sm text-(--color-red)">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <div key={product.id} className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />
            ) : null}
            <p className="font-bold">{product.name}</p>
            <p className="text-sm text-(--color-ink-muted)">₹{product.price}</p>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={quantities[product.id] ?? 1}
                onChange={(e) => setQuantities((q) => ({ ...q, [product.id]: Math.max(1, Number(e.target.value)) }))}
                className="w-16 rounded-md border border-(--color-line) px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => handleSend(product.id)}
                disabled={busy === product.id}
                className="flex-1 rounded-md bg-(--color-green) px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy === product.id ? 'Sending…' : 'Send this'}
              </button>
            </div>

            {placed === product.id ? (
              <p className="mt-2 text-xs font-semibold text-(--color-green)">
                Order placed — payment happens in the Sukyoo app for now.
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
