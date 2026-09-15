import { useState } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import RazorpayCheckout from 'react-native-razorpay';
import { useCreateOrder, useCreateRazorpayOrder, useProducts } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, spacing } from '../../theme/tokens';
import type { ShopStackParamList } from '../../navigation/types';

export function ProductListScreen() {
  const { params } = useRoute<RouteProp<ShopStackParamList, 'ProductList'>>();
  const userId = useCurrentUserId();
  const { data: products, isLoading } = useProducts(params.categoryId);
  const createOrder = useCreateOrder();
  const createRazorpayOrder = useCreateRazorpayOrder();
  const [buyingId, setBuyingId] = useState<string | null>(null);

  async function handleBuyNow(productId: string, productName: string) {
    if (!userId) return;
    setBuyingId(productId);
    try {
      const order = await createOrder.mutateAsync({ belongsToUserId: userId, items: [{ product_id: productId, quantity: 1 }] });
      const checkout = await createRazorpayOrder.mutateAsync(order.id);
      await RazorpayCheckout.open({
        key: checkout.razorpayKeyId,
        order_id: checkout.razorpayOrderId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'Sukyoo',
        description: productName,
      });
      notify('Payment submitted', "We're confirming it now — you'll see it in your orders shortly.");
    } catch (e: any) {
      if (e?.code !== undefined) {
        // react-native-razorpay's own cancel/error shape — user closed the sheet, not a real failure
        notify('Payment not completed', e?.description ?? 'You can try again anytime.');
      } else {
        notify('Could not place order', e instanceof Error ? e.message : 'Try again.');
      }
    } finally {
      setBuyingId(null);
    }
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={products ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<ScreenHeader title={params.categoryName} />}
      ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No products in this category yet.</Text> : null}
      renderItem={({ item }) => (
        <ListRow
          icon="product"
          title={item.name}
          subtitle={`₹${item.price.toLocaleString('en-IN')}${item.is_subscription_eligible ? ' · subscribe & save available' : ''}`}
          actionLabel={buyingId === item.id ? 'Processing...' : 'Buy now'}
          onPressAction={() => handleBuyNow(item.id, item.name)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.md, gap: spacing.sm },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: spacing.lg },
});
