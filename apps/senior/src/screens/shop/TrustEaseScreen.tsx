import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '../../components/Icon';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import type { RootStackParamList } from '../../navigation/types';

// Informational by design — the mockup is a reassurance screen, not a set of
// controls. The one exception is family co-ordering, which is a real feature
// with a real place to set it up.
export function TrustEaseScreen() {
  const { scale } = useFontScale();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Trust & ease" subtitle="Shopping you can rely on" />

      <ListRow icon="verified" title="Verified seller badge" subtitle="Every product quality-checked" tint={colors.coralTint} />
      <ListRow icon="returns" title="Easy returns & pickup" subtitle="Doorstep pickup, no questions asked" tint={colors.greenTint} />
      <ListRow icon="payment" title="Cash or assisted payment" subtitle="COD, UPI help & family billing" tint={colors.amberTint} />

      <View style={styles.featureCard}>
        <View style={styles.featureTitleRow}>
          <Icon name="family" size={22 * scale} color="#fff" />
          <Text style={[styles.featureTitle, { fontSize: fontSize.body * scale }]}>Family co-ordering</Text>
        </View>
        <Text style={[styles.featureSubtitle, { fontSize: fontSize.label * scale }]}>
          Children can order & gift remotely
        </Text>
        <Text
          accessibilityRole="button"
          onPress={() => navigation.navigate('FamilySharing')}
          style={[styles.featureAction, { fontSize: fontSize.label * scale }]}
        >
          Set this up →
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl * 2 },
  featureCard: { backgroundColor: colors.ink, borderRadius: radii.card, padding: spacing.md, gap: 4, marginTop: spacing.xs },
  featureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureTitle: { color: '#fff', fontWeight: '800' },
  featureSubtitle: { color: '#D9D2C8' },
  featureAction: { color: colors.amber, fontWeight: '800', marginTop: spacing.xs },
});
