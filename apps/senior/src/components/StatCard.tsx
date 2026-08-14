import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radii, spacing } from '../theme/tokens';
import { useFontScale } from '../theme/FontScaleContext';

const STATUS_LABEL: Record<string, string> = { normal: 'Normal', low: 'Low', high: 'High' };
const STATUS_ICON: Record<string, string> = { normal: '✓', low: '▼', high: '▲' };
const STATUS_COLOR: Record<string, string> = {
  normal: colors.statusNormal,
  low: colors.statusLow,
  high: colors.statusHigh,
};

// Status is always shown as icon + text, never color alone — a red-green
// colorblind user still needs to tell "high" from "normal" at a glance.
export function StatCard({ label, value, unit, status }: { label: string; value: string; unit?: string; status?: string }) {
  const { scale } = useFontScale();
  const statusColor = STATUS_COLOR[status ?? 'normal'];

  return (
    <View style={styles.card}>
      <Text style={[styles.label, { fontSize: fontSize.label * scale }]}>{label}</Text>
      <Text style={[styles.value, { fontSize: fontSize.title * scale }]}>
        {value}
        {unit ? <Text style={[styles.unit, { fontSize: fontSize.label * scale }]}> {unit}</Text> : null}
      </Text>
      {status ? (
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}1A` }]}>
          <Text style={{ color: statusColor, fontSize: fontSize.label * 0.9 * scale, fontWeight: '700' }}>
            {STATUS_ICON[status] ?? ''} {STATUS_LABEL[status] ?? status}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '31%',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
  },
  label: { color: colors.inkMuted },
  value: { color: colors.ink, fontWeight: '700' },
  unit: { fontWeight: '400', color: colors.inkMuted },
  statusPill: { alignSelf: 'flex-start', borderRadius: radii.chip, paddingHorizontal: spacing.sm, paddingVertical: 2, marginTop: 2 },
});
