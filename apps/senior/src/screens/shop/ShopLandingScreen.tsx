import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProductCategories, useProducts } from '@sukyoo/core';
import { HeroBanner } from '../../components/HeroBanner';
import type { IconName } from '../../components/Icon';
import { ListRow } from '../../components/ListRow';
import { ModuleGridTile } from '../../components/ModuleGridTile';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import type { ShopStackParamList } from '../../navigation/types';

const MODULES: { key: keyof ShopStackParamList; icon: IconName; title: string; subtitle: string; tint: string }[] = [
  { key: 'CoreCategories', icon: 'cart', title: 'Core categories', subtitle: 'Health, grocery, apparel & more', tint: colors.greenTint },
  { key: 'Convenience', icon: 'subscribe', title: 'Convenience', subtitle: 'Subscriptions & assisted shopping', tint: colors.coralTint },
  { key: 'ServicesMarketplace', icon: 'services', title: 'Services marketplace', subtitle: 'Home repair, help & advisory', tint: colors.greenTint },
  { key: 'TrustEase', icon: 'shield', title: 'Trust & ease', subtitle: 'Verified sellers, easy returns', tint: colors.coralTint },
];

export function ShopLandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ShopStackParamList>>();
  const { scale } = useFontScale();
  const [search, setSearch] = useState('');
  const { data: products } = useProducts();
  const { data: categories } = useProductCategories();

  const query = search.trim().toLowerCase();
  // ponytail: client-side match over the whole catalog — fine at a few dozen
  // products, move to a server-side text search once it outgrows one page.
  const results = query
    ? (products ?? []).filter((p) => `${p.name} ${p.description ?? ''}`.toLowerCase().includes(query))
    : [];
  const categoryName = (id: string) => categories?.find((c) => c.id === id)?.name ?? 'Products';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Shop" subtitle="Everyday essentials, delivered" />

      <TextInput
        style={[styles.search, { fontSize: fontSize.body * scale }]}
        placeholder="Search medicines, groceries..."
        placeholderTextColor={colors.inkMuted}
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
        accessibilityLabel="Search products"
      />

      {query ? (
        results.length ? (
          results.map((p) => (
            <ListRow
              key={p.id}
              icon="product"
              tint={colors.greenTint}
              title={p.name}
              subtitle={`₹${p.price.toLocaleString('en-IN')}`}
              onPress={
                p.category_id
                  ? () => navigation.navigate('ProductList', { categoryId: p.category_id!, categoryName: categoryName(p.category_id!) })
                  : undefined
              }
            />
          ))
        ) : (
          <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>No products match "{search.trim()}".</Text>
        )
      ) : (
        <>
          <HeroBanner
            accent="green"
            tone="solid"
            icon="subscribe"
            title="Auto-reorder essentials"
            subtitle="Medicines & staples delivered on a schedule you set"
            onPress={() => navigation.navigate('Convenience')}
          />
          <View style={styles.grid}>
            {MODULES.map((m) => (
              <ModuleGridTile
                key={m.key}
                icon={m.icon}
                title={m.title}
                subtitle={m.subtitle}
                tint={m.tint}
                // React Navigation's `navigate` overloads are keyed per literal
                // screen name; iterating a static config list doesn't narrow.
                onPress={() => navigation.navigate(m.key as any)}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  search: {
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { color: colors.inkMuted, marginTop: spacing.sm },
});
