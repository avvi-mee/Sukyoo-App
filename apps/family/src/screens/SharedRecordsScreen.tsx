import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import { useSharedDoseLogs, useSharedHealthRecords, useSharedInsuranceClaims, useSharedMedications, useSharedVitals } from '@sukyoo/core';
import { Card } from '../components/Card';
import { Row } from '../components/Row';
import { useActiveSenior } from '../state/ActiveSeniorContext';
import { colors, spacing } from '../theme/tokens';

function NotSharedNotice({ query, name, what }: { query: UseQueryResult<unknown, unknown>; name: string; what: string }) {
  if (!query.isError) return null;
  return (
    <Card style={styles.noticeCard}>
      <Text style={styles.noticeText}>{name} hasn't shared {what} with you yet.</Text>
    </Card>
  );
}

export function SharedRecordsScreen() {
  const { activeSenior } = useActiveSenior();
  const seniorId = activeSenior?.seniorId;
  const name = activeSenior?.name ?? 'This person';

  const vitals = useSharedVitals(seniorId);
  const medications = useSharedMedications(seniorId);
  const doseLogs = useSharedDoseLogs(seniorId);
  const records = useSharedHealthRecords(seniorId);
  const claims = useSharedInsuranceClaims(seniorId);

  if (!activeSenior) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Link to a family member first (see Settings).</Text>
      </View>
    );
  }

  const takenCount = (doseLogs.data ?? []).filter((d) => d.status === 'taken').length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{name}'s health</Text>

      <NotSharedNotice query={vitals} name={name} what="vitals" />
      {(vitals.data ?? []).slice(0, 3).map((v) => (
        <Row key={v.id} icon="🩸" title={v.vital_type.replace(/_/g, ' ')} subtitle={`${v.status ?? '—'} · ${new Date(v.recorded_at).toLocaleDateString()}`} />
      ))}

      <NotSharedNotice query={medications} name={name} what="medications" />
      {medications.data?.length ? (
        <Row icon="💊" title="Medication adherence today" subtitle={`${takenCount} of ${doseLogs.data?.length ?? 0} doses taken`} />
      ) : null}

      <NotSharedNotice query={records} name={name} what="health records" />
      {(records.data ?? []).slice(0, 3).map((r) => (
        <Row key={r.id} icon="📄" title={r.record_type.replace(/_/g, ' ')} subtitle={new Date(r.created_at).toLocaleDateString()} />
      ))}

      <NotSharedNotice query={claims} name={name} what="insurance claims" />
      {(claims.data ?? []).slice(0, 3).map((c) => (
        <Row key={c.id} icon="📋" title={c.claim_type ?? 'Claim'} subtitle={c.status.replace(/_/g, ' ')} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.lg },
  heading: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: spacing.sm },
  empty: { color: colors.inkMuted, textAlign: 'center' },
  noticeCard: { backgroundColor: colors.primaryTint, borderColor: colors.primary, marginBottom: spacing.sm },
  noticeText: { color: colors.primary },
});
