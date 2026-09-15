import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { BuyButton } from './_components/BuyButton';

export default async function ShopPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: products } = await supabase.from('products').select('*').eq('is_active', true);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold">Shop</h1>
      <p className="mt-1 text-(--color-ink-muted)">Order essentials — delivered to you.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(products ?? []).map((p) => (
          <div key={p.id} className="rounded-xl border border-(--color-line) bg-(--color-surface) p-4">
            <p className="font-bold">{p.name}</p>
            {p.description ? <p className="mt-1 text-sm text-(--color-ink-muted)">{p.description}</p> : null}
            <p className="mt-2 font-semibold text-(--color-green)">₹{p.price}</p>
            <div className="mt-3">
              <BuyButton productId={p.id} userId={profile.id} />
            </div>
          </div>
        ))}
        {!products?.length ? <p className="text-sm text-(--color-ink-muted)">Nothing in the shop right now.</p> : null}
      </div>
    </div>
  );
}
