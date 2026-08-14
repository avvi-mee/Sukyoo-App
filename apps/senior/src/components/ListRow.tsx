import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../theme/tokens';
import { useFontScale } from '../theme/FontScaleContext';
import { BigButton } from './BigButton';

// The repeated "leading icon chip + title/subtitle + trailing action" row
// used for doctor cards, medication rows, event listings, etc.
export function ListRow({
  icon,
  title,
  subtitle,
  tint = colors.coralTint,
  actionLabel,
  onPressAction,
  onPress,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  tint?: string;
  actionLabel?: string;
  onPressAction?: () => void;
  onPress?: () => void;
}) {
  const { scale } = useFontScale();

  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: tint }]}>
          <Text style={{ fontSize: 22 * scale }}>{icon}</Text>
        </View>
      ) : null}
      <View style={styles.textCol}>
        <Text style={[styles.title, { fontSize: fontSize.body * scale }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { fontSize: fontSize.label * scale }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onPressAction ? (
        <BigButton label={actionLabel} onPress={onPressAction} style={styles.action} />
      ) : null}
    </View>
  );

  if (!onPress) return <View style={styles.card}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTouchTarget },
  iconWrap: { width: 44, height: 44, borderRadius: radii.card, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1, gap: 2 },
  title: { color: colors.ink, fontWeight: '700' },
  subtitle: { color: colors.inkMuted },
  action: { paddingHorizontal: spacing.md, minHeight: 44 },
});
