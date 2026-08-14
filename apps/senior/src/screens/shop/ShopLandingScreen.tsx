import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ModuleGridTile } from '../../components/ModuleGridTile';
import { SectionHeader } from '../../components/SectionHeader';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import type { ShopStackParamList } from '../../navigation/types';

const MODULES: { key: keyof ShopStackParamList; icon: string; title: string; subtitle: string }[] = [
  { key: 'CoreCategories', icon: '🛍️', title: 'Core categories', subtitle: 'Curated for senior living' },
  { key: 'Convenience', icon: '🔄', title: 'Convenience', subtitle: 'Auto-reorder, assisted & voice shopping' },
  { key: 'ServicesMarketplace', icon: '🛠️', title: 'Services marketplace', subtitle: 'Repairs, help & support at home' },
  { key: 'TrustEase', icon: '✅', title: 'Trust & ease', subtitle: 'Verified sellers, easy returns' },
];

export function ShopLandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ShopStackParamList>>();
  const { scale } = useFontScale();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Shop" />
      <View style={styles.banner}>
        <Text style={[styles.bannerTitle, { fontSize: fontSize.body * scale }]}>Subscribe & save 15%</Text>
        <Text style={[styles.bannerSubtitle, { fontSize: fontSize.label * scale }]}>On recurring medicines & essentials</Text>
      </View>
      <View style={styles.grid}>
        {MODULES.map((m) => (
          <ModuleGridTile key={m.key} icon={m.icon} title={m.title} subtitle={m.subtitle} tint={colors.greenTint} onPress={() => navigation.navigate(m.key as any)} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  banner: { backgroundColor: colors.greenTint, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.md, gap: 2 },
  bannerTitle: { color: colors.green, fontWeight: '800' },
  bannerSubtitle: { color: colors.green },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
