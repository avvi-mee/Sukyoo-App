import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../theme/tokens';
import { useFontScale } from '../theme/FontScaleContext';
import { Icon, type IconName } from './Icon';

export type HeroAccent = 'coral' | 'green' | 'amber' | 'red' | 'ink';

const SOLID: Record<HeroAccent, string> = {
  coral: colors.coral,
  green: colors.green,
  amber: colors.amber,
  red: colors.red,
  ink: colors.ink,
};

const TINT: Record<HeroAccent, string> = {
  coral: colors.coralTint,
  green: colors.greenTint,
  amber: colors.amberTint,
  red: colors.redTint,
  ink: colors.border,
};

// The full-width accent card that opens most screens in the mockups — the
// senior's single most important "what's happening right now" line. Two
// treatments: `solid` (white on accent, for the primary call to action) and
// `tint` (accent-coloured text on a pale wash, for informational context).
export function HeroBanner({
  accent = 'coral',
  tone = 'solid',
  eyebrow,
  title,
  subtitle,
  icon,
  actionLabel,
  onPressAction,
  onPress,
  progress,
  style,
}: {
  accent?: HeroAccent;
  tone?: 'solid' | 'tint';
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: IconName;
  actionLabel?: string;
  onPressAction?: () => void;
  onPress?: () => void;
  /** 0-1. Renders a progress track beneath the text (medication adherence). */
  progress?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { scale } = useFontScale();
  const isSolid = tone === 'solid';
  const background = isSolid ? SOLID[accent] : TINT[accent];
  const foreground = isSolid ? '#fff' : SOLID[accent];
  // On a solid accent the secondary line needs to stay legible without
  // dropping to a grey that fails contrast against the colour behind it.
  const mutedForeground = isSolid ? 'rgba(255,255,255,0.85)' : colors.inkMuted;

  const body = (
    <>
      <View style={styles.row}>
        {icon ? <Icon name={icon} size={22 * scale} color={foreground} /> : null}
        <View style={styles.textCol}>
          {eyebrow ? (
            <Text style={[styles.eyebrow, { color: mutedForeground, fontSize: fontSize.label * scale }]}>{eyebrow}</Text>
          ) : null}
          <Text style={[styles.title, { color: foreground, fontSize: fontSize.title * 0.85 * scale }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: mutedForeground, fontSize: fontSize.label * scale }]}>{subtitle}</Text>
          ) : null}
        </View>
        {actionLabel && onPressAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onPressAction}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: isSolid ? '#fff' : SOLID[accent], opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.actionLabel, { color: isSolid ? SOLID[accent] : '#fff', fontSize: fontSize.label * scale }]}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {progress !== undefined ? (
        <View style={[styles.track, { backgroundColor: isSolid ? 'rgba(255,255,255,0.3)' : `${SOLID[accent]}33` }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: isSolid ? '#fff' : SOLID[accent], width: `${Math.max(0, Math.min(1, progress)) * 100}%` },
            ]}
          />
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.banner, { backgroundColor: background }, style]}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.banner, { backgroundColor: background, opacity: pressed ? 0.9 : 1 }, style]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  textCol: { flex: 1, gap: 2 },
  eyebrow: { fontWeight: '600' },
  title: { fontWeight: '800' },
  subtitle: {},
  action: {
    minHeight: minTouchTarget * 0.75,
    paddingHorizontal: spacing.md,
    borderRadius: radii.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontWeight: '800' },
  track: { height: 10, borderRadius: radii.chip, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.chip },
});
