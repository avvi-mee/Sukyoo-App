import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProductCategories } from '@sukyoo/core';
import { ModuleGridTile } from '../../components/ModuleGridTile';
import { SectionHeader } from '../../components/SectionHeader';
import { colors, spacing } from '../../theme/tokens';
import type { ShopStackParamList } from '../../navigation/types';

export function CoreCategoriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ShopStackParamList>>();
  const { data: categories } = useProductCategories();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Core categories" subtitle="Curated for senior living" />
      <View style={styles.grid}>
        {(categories ?? []).map((c) => (
          <ModuleGridTile
            key={c.id}
            icon={c.icon ?? '🛍️'}
            title={c.name}
            tint={colors.greenTint}
            onPress={() => navigation.navigate('ProductList', { categoryId: c.id, categoryName: c.name })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
