import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { useServiceListings } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { colors, spacing } from '../../theme/tokens';

const CATEGORY_ICON: Record<string, string> = {
  home_repair: '🔧',
  domestic_help: '🧹',
  tech_support: '💻',
  legal_financial: '⚖️',
};

export function ServicesMarketplaceScreen() {
  const { data: listings } = useServiceListings();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Services marketplace" />
      {(listings ?? []).map((s) => (
        <ListRow
          key={s.id}
          icon={CATEGORY_ICON[s.category] ?? '🛠️'}
          title={s.name}
          subtitle={s.price_label ?? s.description ?? undefined}
          actionLabel="Enquire"
          onPressAction={() => Linking.openURL('tel:+911800000000')}
        />
      ))}
      {!listings?.length ? <Text style={styles.empty}>No services listed yet.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl * 2 },
  empty: { color: colors.inkMuted },
});
