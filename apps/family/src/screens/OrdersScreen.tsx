import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useCreateOrder, useCreateRazorpayOrder, useProducts } from '@sukyoo/core';
import { Row } from '../components/Row';
import { useActiveSenior } from '../state/ActiveSeniorContext';
import { colors, spacing } from '../theme/tokens';

// Family co-ordering: buy something for the active senior, paid for by the
// family member (payer defaults to the orderer — see create_order() in
// 0005_ecommerce.sql). Requires an active 'order' permission grant from the
// senior, same as the shared-records view requires 'health_record' etc.
export function OrdersScreen() {
  const { activeSenior } = useActiveSenior();
  const { data: products, isLoading } = useProducts();
  const createOrder = useCreateOrder();
  const createRazorpayOrder = useCreateRazorpayOrder();
  const [buyingId, setBuyingId] = useState<string | null>(null);

  async function handleGift(productId: string, productName: string) {
    if (!activeSenior) return;
    setBuyingId(productId);
    try {
      const order = await createOrder.mutateAsync({ belongsToUserId: activeSenior.seniorId, items: [{ product_id: productId, quantity: 1 }] });
      const checkout = await createRazorpayOrder.mutateAsync(order.id);
      await RazorpayCheckout.open({
        key: checkout.razorpayKeyId,
        order_id: checkout.razorpayOrderId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'Sukyoo',
        description: `${productName} for ${activeSenior.name}`,
      });
      Alert.alert('Gift sent', `We're confirming your order for ${activeSenior.name} now.`);
    } catch (e: any) {
      if (e?.message === 'not authorized') {
        Alert.alert('Not shared yet', `Ask ${activeSenior.name} to invite you and enable family co-ordering first.`);
      } else if (e?.code === undefined) {
        Alert.alert('Could not place order', e instanceof Error ? e.message : 'Try again.');
      } else {
        Alert.alert('Payment not completed', e?.description ?? 'You can try again anytime.');
      }
    } finally {
      setBuyingId(null);
    }
  }

  if (!activeSenior) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.center}>
        <Text style={styles.empty}>Link to a family member first (see Settings).</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Order for {activeSenior.name}</Text>
      {(products ?? []).map((p) => (
        <Row
          key={p.id}
          icon="📦"
          title={p.name}
          subtitle={`₹${p.price.toLocaleString('en-IN')}`}
          actionLabel={buyingId === p.id ? 'Processing...' : 'Gift'}
          onPressAction={() => handleGift(p.id, p.name)}
        />
      ))}
      {!isLoading && !products?.length ? <Text style={styles.empty}>No products available yet.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  heading: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: spacing.sm },
  empty: { color: colors.inkMuted, textAlign: 'center' },
});
