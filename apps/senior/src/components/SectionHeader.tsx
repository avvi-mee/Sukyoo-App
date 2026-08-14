import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../theme/tokens';
import { useFontScale } from '../theme/FontScaleContext';

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { scale } = useFontScale();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { fontSize: fontSize.headline * scale }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { fontSize: fontSize.body * scale }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md, gap: 4 },
  title: { color: colors.ink, fontWeight: '800' },
  subtitle: { color: colors.inkMuted },
});
