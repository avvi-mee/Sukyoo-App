import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProductCategories } from '@sukyoo/core';
import type { IconName } from '../../components/Icon';
import { ModuleGridTile } from '../../components/ModuleGridTile';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import type { ShopStackParamList } from '../../navigation/types';

// Keyed on slug, not the table's `icon` column — that column holds emoji, and
// the design is line icons. A new category simply falls back to `product`.
const CATEGORY_ICON: Record<string, IconName> = {
  'medicines-devices': 'medication',
  'daily-groceries': 'groceries',
  'apparel-footwear': 'apparel',
  'mobility-comfort': 'accessible',
  'nutrition-supplements': 'nutrition',
  'home-safety': 'shield',
};

export function CoreCategoriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ShopStackParamList>>();
  const { scale } = useFontScale();
  const { data: categories, isLoading } = useProductCategories();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Core categories" subtitle="Curated for senior living" />

      <View style={styles.grid}>
        {(categories ?? []).map((c, i) => (
          <ModuleGridTile
            key={c.id}
            icon={CATEGORY_ICON[c.slug] ?? 'product'}
            title={c.name}
            // Alternating tints keep a long grid readable at a glance without
            // giving any one category a meaning it doesn't have.
            tint={i % 2 === 0 ? colors.coralTint : colors.greenTint}
            onPress={() => navigation.navigate('ProductList', { categoryId: c.id, categoryName: c.name })}
          />
        ))}
      </View>
      {!isLoading && !categories?.length ? (
        <Text style={[styles.muted, { fontSize: fontSize.body * scale }]}>No categories yet.</Text>
      ) : null}

      <View style={styles.bundleSection}>
        <SectionHeader title="Curated bundle" />
        <View style={styles.placeholder}>
          <Text style={[styles.placeholderTitle, { fontSize: fontSize.body * scale }]}>No bundles yet</Text>
          <Text style={[styles.muted, { fontSize: fontSize.label * scale }]}>
            Ready-made kits are being put together with our partners. Until then, browse a category above.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bundleSection: { marginTop: spacing.lg },
  placeholder: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.md,
    gap: 4,
  },
  placeholderTitle: { color: colors.ink, fontWeight: '700' },
  muted: { color: colors.inkMuted },
});
