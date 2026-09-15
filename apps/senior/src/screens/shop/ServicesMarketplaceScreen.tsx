import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { useServiceListings } from '@sukyoo/core';
import { Icon, type IconName } from '../../components/Icon';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, fontSize, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

const SUPPORT_LINE = 'tel:+911800000000';

const CATEGORY_ICON: Record<string, IconName> = {
  home_repair: 'services',
  domestic_help: 'person',
  tech_support: 'device',
  legal_financial: 'record',
};

export function ServicesMarketplaceScreen() {
  const { scale } = useFontScale();
  const { data: listings, isLoading } = useServiceListings();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Services" subtitle="Trusted help at your doorstep" />

      {(listings ?? []).map((s) => (
        <ListRow
          key={s.id}
          icon={CATEGORY_ICON[s.category] ?? 'services'}
          title={s.name}
          subtitle={s.description ?? s.price_label ?? undefined}
          tint={colors.greenTint}
          // Vendor-fulfilled: a human takes the booking over the phone rather
          // than the app pretending to schedule a third party's staff.
          onPress={() => Linking.openURL(SUPPORT_LINE)}
          trailing={<Icon name="forward" size={20} color={colors.inkMuted} />}
        />
      ))}

      {!isLoading && !listings?.length ? (
        <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>No services listed yet.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl * 2 },
  empty: { color: colors.inkMuted },
});
