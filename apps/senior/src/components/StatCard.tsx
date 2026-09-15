import { StyleSheet, Text, View } from 'react-native';
import { StatusPill, type StatusTone } from './StatusPill';
import { colors, fontSize, radii, spacing } from '../theme/tokens';
import { useFontScale } from '../theme/FontScaleContext';

const STATUS_LABEL: Record<string, string> = {
  normal: 'Normal',
  low: 'Slightly low',
  high: 'Slightly high',
};

export function StatCard({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: string;
  unit?: string;
  status?: string;
}) {
  const { scale } = useFontScale();

  return (
    <View style={styles.card}>
      <Text style={[styles.label, { fontSize: fontSize.label * scale }]}>{label}</Text>
      <Text style={[styles.value, { fontSize: fontSize.title * scale }]}>
        {value}
        {unit ? <Text style={[styles.unit, { fontSize: fontSize.label * scale }]}> {unit}</Text> : null}
      </Text>
      {status ? <StatusPill label={STATUS_LABEL[status] ?? status} tone={status as StatusTone} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
  },
  label: { color: colors.inkMuted },
  value: { color: colors.ink, fontWeight: '800' },
  unit: { fontWeight: '400', color: colors.inkMuted },
});
