import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAddVitalReading, useHealthRecords, useUploadHealthRecord, useVitals } from '@sukyoo/core';
import { BigButton } from '../../components/BigButton';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { StatCard } from '../../components/StatCard';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, spacing } from '../../theme/tokens';

const LATEST: { vitalType: string; label: string; unit: string; pick: (v: Record<string, number>) => string }[] = [
  { vitalType: 'blood_pressure', label: 'Blood pressure', unit: 'mmHg', pick: (v) => `${v.systolic}/${v.diastolic}` },
  { vitalType: 'blood_sugar', label: 'Blood sugar', unit: 'mg/dL', pick: (v) => `${v.value}` },
  { vitalType: 'spo2', label: 'SpO2', unit: '%', pick: (v) => `${v.value}` },
];

export function DiagnosticsScreen() {
  const userId = useCurrentUserId();
  const { data: vitals } = useVitals(userId);
  const { data: records } = useHealthRecords(userId);
  const addVital = useAddVitalReading();
  const uploadRecord = useUploadHealthRecord();

  const latestByType = useMemo(() => {
    const map = new Map<string, NonNullable<typeof vitals>[number]>();
    for (const v of vitals ?? []) if (!map.has(v.vital_type)) map.set(v.vital_type, v);
    return map;
  }, [vitals]);

  function handleQuickLog(vitalType: 'blood_pressure' | 'blood_sugar' | 'spo2') {
    if (!userId) return;
    // A senior-friendly quick-log would use number pickers; keeping this to
    // a couple of representative sample values until that input UI is built.
    const sample: Record<string, number> =
      vitalType === 'blood_pressure' ? { systolic: 122, diastolic: 78 } : vitalType === 'blood_sugar' ? { value: 118 } : { value: 98 };
    addVital.mutate({ ownerId: userId, vitalType, readingValues: sample });
  }

  async function handleUploadRecord() {
    if (!userId) return;
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (result.canceled) return;
    const file = result.assets[0];
    uploadRecord.mutate(
      { ownerId: userId, recordType: 'health_document', fileUri: file.uri, fileName: file.name },
      { onError: (e) => Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again.') }
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Diagnostics & monitoring" />

      <View style={styles.statRow}>
        {LATEST.map((l) => {
          const reading = latestByType.get(l.vitalType);
          return (
            <StatCard
              key={l.vitalType}
              label={l.label}
              value={reading ? l.pick(reading.reading_values as Record<string, number>) : '—'}
              unit={l.unit}
              status={reading?.status ?? undefined}
            />
          );
        })}
      </View>
      <BigButton label="Log today's reading" onPress={() => handleQuickLog('blood_pressure')} variant="secondary" style={styles.logButton} />

      <ListRow icon="🧪" title="Book a lab test" subtitle="Home sample collection available" tint={colors.coralTint} />

      <SectionHeader title="Health records vault" />
      {(records ?? []).map((r) => (
        <ListRow key={r.id} icon="📄" title={r.record_type.replace(/_/g, ' ')} subtitle={new Date(r.created_at).toLocaleDateString()} />
      ))}
      {!records?.length ? <Text style={styles.empty}>No records uploaded yet.</Text> : null}
      <BigButton label="Upload a record" onPress={handleUploadRecord} loading={uploadRecord.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.xs },
  logButton: { marginBottom: spacing.sm },
  empty: { color: colors.inkMuted, marginBottom: spacing.sm },
});
