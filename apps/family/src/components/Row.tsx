import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { Card } from './Card';

export function Row({
  icon,
  title,
  subtitle,
  actionLabel,
  onPressAction,
  onPress,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onPressAction?: () => void;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.row}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onPressAction ? (
        <Pressable onPress={onPressAction} style={styles.actionButton}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Card style={styles.card}>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
          {content}
        </Pressable>
      ) : (
        content
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40 },
  icon: { fontSize: 20 },
  textCol: { flex: 1, gap: 2 },
  title: { color: colors.ink, fontWeight: '600', fontSize: 15 },
  subtitle: { color: colors.inkMuted, fontSize: 13 },
  actionButton: { backgroundColor: colors.primary, borderRadius: radii.button, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
