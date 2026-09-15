import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../theme/tokens';
import { useFontScale } from '../theme/FontScaleContext';
import { Icon, glyphColorFor, type IconName } from './Icon';

// The repeated "icon + title + subtitle" grid tile used by every vertical's
// landing screen (HealthHub's 7-module grid, Ecommerce/Events/Fun's 2x2s).
export function ModuleGridTile({
  icon,
  title,
  subtitle,
  tint = colors.coralTint,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  tint?: string;
  onPress: () => void;
}) {
  const { scale } = useFontScale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tint }]}>
        <Icon name={icon} size={24 * scale} color={glyphColorFor(tint)} />
      </View>
      <Text style={[styles.title, { fontSize: fontSize.label * scale }]} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { fontSize: fontSize.label * 0.85 * scale }]} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '48%',
    minHeight: minTouchTarget * 1.6,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.ink, fontWeight: '700' },
  subtitle: { color: colors.inkMuted },
});
