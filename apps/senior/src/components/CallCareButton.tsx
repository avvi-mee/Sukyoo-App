import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, radii, spacing } from '../theme/tokens';
import { useFontScale } from '../theme/FontScaleContext';

const CARE_LINE = 'tel:+911800000000';

// Mounted once above the navigator (see App.tsx), not per-screen — the
// constant human-fallback affordance every mockup screen shows.
export function CallCareButton() {
  const { scale } = useFontScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Call Sukyoo care"
      onPress={() => Linking.openURL(CARE_LINE)}
      style={({ pressed }) => [styles.pill, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Text style={{ fontSize: 18 }}>📞</Text>
      <Text style={[styles.label, { fontSize: fontSize.label * scale }]}>Call Sukyoo care</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.xl * 2.2,
    backgroundColor: colors.ink,
    borderRadius: radii.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  label: { color: colors.green, fontWeight: '700' },
});
