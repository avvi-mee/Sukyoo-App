import { Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useProducts, useProductSubscriptions, useSetProductSubscription } from '@sukyoo/core';
import { Icon } from '../../components/Icon';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

const SUPPORT_LINE = 'tel:+911800000000';

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
      <ScreenHeader title="Convenience" subtitle="Shopping made effortless" />

      {/* A real person takes the order over the phone — this is the fallback
          for anyone who'd rather not use the app at all. */}
      <View style={styles.assistedCard}>
        <View style={styles.assistedTitleRow}>
          <Icon name="phone" size={22 * scale} color="#fff" />
          <Text style={[styles.assistedTitle, { fontSize: fontSize.body * scale }]}>Assisted shopping</Text>
        </View>
        <Text style={[styles.assistedSubtitle, { fontSize: fontSize.label * scale }]}>
          Call an agent and they'll place the order for you
        </Text>
        <Text
          accessibilityRole="button"
          onPress={() => Linking.openURL(SUPPORT_LINE)}
          style={[styles.assistedAction, { fontSize: fontSize.label * scale }]}
        >
          Call now →
        </Text>
      </View>

      <ListRow
        icon="search"
        title="Voice-assisted search"
        subtitle="Large text, tap to speak — coming soon"
        tint={colors.coralTint}
        onPress={() => notify('Coming soon', 'Voice search is on the way.')}
      />

      <SectionHeader title="Auto-reorder essentials" subtitle="Medicines & staples on a schedule you set" />
      {eligible.map((p) => (
        <View key={p.id} style={styles.subRow}>
          <View style={styles.subText}>
            <Text style={[styles.subLabel, { fontSize: fontSize.body * scale }]}>{p.name}</Text>
            <Text style={[styles.subPrice, { fontSize: fontSize.label * scale }]}>
              ₹{p.price.toLocaleString('en-IN')}
            </Text>
          </View>
          <Switch
            value={subscribedIds.has(p.id)}
            onValueChange={(value) => {
              if (userId) setSubscription.mutate({ userId, productId: p.id, enabled: value });
            }}
            trackColor={{ true: colors.green }}
            accessibilityLabel={`Auto-reorder ${p.name}`}
          />
        </View>
      ))}
      {!eligible.length ? (
        <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>No auto-reorder eligible products yet.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl * 2 },
  assistedCard: { backgroundColor: colors.ink, borderRadius: radii.card, padding: spacing.md, gap: 4 },
  assistedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  assistedTitle: { color: '#fff', fontWeight: '800' },
  assistedSubtitle: { color: '#D9D2C8' },
  assistedAction: { color: colors.amber, fontWeight: '800', marginTop: spacing.xs },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: minTouchTarget,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  subText: { flex: 1, gap: 2 },
  subLabel: { color: colors.ink, fontWeight: '600' },
  subPrice: { color: colors.inkMuted },
  empty: { color: colors.inkMuted },
});
