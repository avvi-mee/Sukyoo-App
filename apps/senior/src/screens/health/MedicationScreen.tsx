import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMarkDoseTaken, useMedications, useTodaysDoses } from '@sukyoo/core';
import { ChecklistRow } from '../../components/ChecklistRow';
import { HeroBanner } from '../../components/HeroBanner';
import { Icon } from '../../components/Icon';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, fontSize, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import { useProtectedScreen } from '../../hooks/useProtectedScreen';

export function MedicationScreen() {
  // Health and life-story data: block screenshots, screen recording and the
  // app-switcher snapshot while this screen is focused.
  useProtectedScreen('MedicationScreen');

  const { scale } = useFontScale();
  const navigation = useNavigation();
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
      <ScreenHeader title="Medication" subtitle="Today's schedule" />

      {total ? (
        <HeroBanner
          accent="coral"
          title={`${taken} of ${total} doses taken today`}
          progress={taken / total}
        />
      ) : null}

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
      {!doses?.length ? (
        <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>No medications scheduled.</Text>
      ) : null}

      {lowStock.length ? (
        <ListRow
          icon="add"
          title="Refill medicines"
          subtitle={`${lowStock.length} medicine${lowStock.length > 1 ? 's' : ''} running low`}
          tint={colors.greenTint}
          // Refill ordering runs through the Shop tab's catalog, which lives in
          // a sibling stack — the senior picks the product there.
          onPress={() => navigation.getParent()?.navigate('Shop')}
          trailing={<Icon name="forward" size={20} color={colors.inkMuted} />}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.xs },
  empty: { color: colors.inkMuted },
});
