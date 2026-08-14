import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useProducts, useProductSubscriptions, useSetProductSubscription } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

export function ConvenienceScreen() {
  const { scale } = useFontScale();
  const userId = useCurrentUserId();
  const { data: products } = useProducts();
  const { data: subscriptions } = useProductSubscriptions(userId);
  const setSubscription = useSetProductSubscription();

  const eligible = (products ?? []).filter((p) => p.is_subscription_eligible);
  const subscribedIds = new Set((subscriptions ?? []).filter((s) => s.is_active).map((s) => s.product_id));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Convenience" />

      <ListRow icon="🤝" title="Assisted shopping" subtitle="Call an agent to order for you" onPress={() => Linking.openURL('tel:+911800000000')} />
      <ListRow
        icon="🎙️"
        title="Voice-assisted search"
        subtitle="Large text, tap to speak"
        onPress={() => Alert.alert('Coming soon', 'Voice search is on the way.')}
      />

      <SectionHeader title="Auto-reorder essentials" subtitle="Rice, medicines & staples on schedule" />
      {eligible.map((p) => (
        <View key={p.id} style={styles.subRow}>
          <Text style={[styles.subLabel, { fontSize: fontSize.body * scale }]}>{p.name}</Text>
          <Switch
            value={subscribedIds.has(p.id)}
            onValueChange={(value) => {
              if (userId) setSubscription.mutate({ userId, productId: p.id, enabled: value });
            }}
            trackColor={{ true: colors.green }}
          />
        </View>
      ))}
      {!eligible.length ? <Text style={styles.empty}>No auto-reorder eligible products yet.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl * 2 },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  subLabel: { color: colors.ink, fontWeight: '600', flex: 1 },
  empty: { color: colors.inkMuted },
});
