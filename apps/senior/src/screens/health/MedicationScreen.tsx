import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMarkDoseTaken, useMedications, useTodaysDoses } from '@sukyoo/core';
import { ChecklistRow } from '../../components/ChecklistRow';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

export function MedicationScreen() {
  const { scale } = useFontScale();
  const userId = useCurrentUserId();
  const { data: medications } = useMedications(userId);
  const { data: doses } = useTodaysDoses(userId);
  const markTaken = useMarkDoseTaken(userId);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const medById = useMemo(() => new Map((medications ?? []).map((m) => [m.id, m])), [medications]);

  const taken = (doses ?? []).filter((d) => d.status === 'taken').length;
  const total = doses?.length ?? 0;

  const lowStock = (medications ?? []).filter((m) => (m.doses_remaining ?? Infinity) <= m.refill_threshold);

  async function handleCheck(doseId: string) {
    setPendingId(doseId);
    try {
      await markTaken.mutateAsync(doseId);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Medication" />

      <View style={styles.progressCard}>
        <Text style={[styles.progressText, { fontSize: fontSize.body * scale }]}>
          {taken} of {total} doses taken today
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: total ? `${(taken / total) * 100}%` : '0%' }]} />
        </View>
      </View>

      {(doses ?? []).map((dose) => {
        const med = medById.get(dose.medication_id);
        return (
          <ChecklistRow
            key={dose.id}
            title={med ? `${med.name}${med.dosage ? ` ${med.dosage}` : ''}` : 'Medication'}
            subtitle={new Date(dose.scheduled_for).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            checked={dose.status === 'taken'}
            busy={pendingId === dose.id}
            onCheck={() => handleCheck(dose.id)}
          />
        );
      })}
      {!doses?.length ? <Text style={styles.empty}>No medications scheduled.</Text> : null}

      {lowStock.length ? (
        <ListRow
          icon="🔄"
          title="Refill medicines"
          subtitle={`${lowStock.length} medicine${lowStock.length > 1 ? 's' : ''} running low`}
          tint={colors.amberTint}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.xs },
  progressCard: { backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.xs },
  progressText: { color: colors.ink, fontWeight: '700' },
  progressTrack: { height: 10, borderRadius: radii.chip, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.statusNormal },
  empty: { color: colors.inkMuted },
});
