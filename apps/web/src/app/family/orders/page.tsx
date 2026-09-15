import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getLinkedSeniors } from '../_components/getLinkedSeniors';
import { SeniorSwitcher } from '../_components/SeniorSwitcher';
import { OrderForm } from './OrderForm';

export default async function FamilyOrdersPage({ searchParams }: { searchParams: Promise<{ senior?: string }> }) {
  const profile = await requireProfile();
  const seniors = await getLinkedSeniors(profile.id);
  const { senior: seniorParam } = await searchParams;
  const selected = seniors.find((s) => s.seniorId === seniorParam) ?? seniors[0];

  if (!selected) {
    return <p className="text-sm text-(--color-ink-muted)">Link a senior first to send them something.</p>;
  }

  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, image_url')
    .eq('is_active', true)
    .order('name');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-extrabold">Send something to {selected.fullName ?? 'your family member'}</h1>
      <SeniorSwitcher seniors={seniors} selectedId={selected.seniorId} basePath="/family/orders" />

      {!products?.length ? (
        <p className="text-sm text-(--color-ink-muted)">Nothing in the catalogue right now.</p>
      ) : (
        <OrderForm seniorId={selected.seniorId} seniorName={selected.fullName ?? 'them'} products={products} />
      )}
    </div>
  );
}
