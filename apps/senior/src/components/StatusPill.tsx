import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radii, spacing } from '../theme/tokens';
import { useFontScale } from '../theme/FontScaleContext';

export type StatusTone = 'normal' | 'low' | 'high' | 'info' | 'neutral';

const TONE_COLOR: Record<StatusTone, string> = {
  normal: colors.statusNormal,
  low: colors.statusLow,
  high: colors.statusHigh,
  info: colors.coral,
  neutral: colors.inkMuted,
};

// Label-only, matching the mockups. There's no icon here and that's deliberate:
// the wording ("Normal", "Slightly high") is what distinguishes the states, so
// meaning never rests on colour alone even for a colourblind reader.
export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  const { scale } = useFontScale();
  const color = TONE_COLOR[tone];

  return (
    <View style={[styles.pill, { backgroundColor: `${color}1F` }]}>
      <Text style={[styles.text, { color, fontSize: fontSize.label * 0.9 * scale }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radii.button,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  text: { fontWeight: '700' },
});
