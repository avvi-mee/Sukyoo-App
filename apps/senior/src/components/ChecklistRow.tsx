import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../theme/tokens';
import { useFontScale } from '../theme/FontScaleContext';
import { Icon } from './Icon';

// The medication dose row: tap the circle to mark taken. Large hit target,
// state conveyed by both fill color and the checkmark glyph, not fill alone.
export function ChecklistRow({
  title,
  subtitle,
  checked,
  busy,
  onCheck,
}: {
  title: string;
  subtitle?: string;
  checked: boolean;
  busy?: boolean;
  onCheck: () => void;
}) {
  const { scale } = useFontScale();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={checked ? `${title}, taken` : `${title}, mark as taken`}
        disabled={checked || busy}
        onPress={onCheck}
        style={[styles.checkbox, checked && styles.checkboxChecked]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.coral} />
        ) : checked ? (
          <Icon name="check" size={22} color={colors.statusNormal} strokeWidth={3} />
        ) : null}
      </Pressable>
      <View style={styles.textCol}>
        <Text style={[styles.title, { fontSize: fontSize.body * scale }, checked && styles.titleChecked]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { fontSize: fontSize.label * scale }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  checkbox: {
    width: minTouchTarget * 0.7,
    height: minTouchTarget * 0.7,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.greenTint, borderColor: colors.statusNormal },
  check: { color: colors.statusNormal, fontWeight: '900', fontSize: 20 },
  textCol: { flex: 1, gap: 2 },
  title: { color: colors.ink, fontWeight: '700' },
  titleChecked: { color: colors.inkMuted, textDecorationLine: 'line-through' },
  subtitle: { color: colors.inkMuted },
});
