import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAddVitalReading, useHealthRecords, useUploadHealthRecord, useVitals } from '@sukyoo/core';
import { BigButton } from '../../components/BigButton';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { StatCard } from '../../components/StatCard';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import { useProtectedScreen } from '../../hooks/useProtectedScreen';

type VitalType = 'blood_pressure' | 'blood_sugar' | 'spo2';

const LATEST: { vitalType: VitalType; label: string; unit: string; pick: (v: Record<string, number>) => string }[] = [
  { vitalType: 'blood_pressure', label: 'Blood pressure', unit: 'mmHg', pick: (v) => `${v.systolic}/${v.diastolic}` },
  { vitalType: 'blood_sugar', label: 'Blood sugar', unit: 'mg/dL', pick: (v) => `${v.value}` },
  { vitalType: 'spo2', label: 'SpO2', unit: '%', pick: (v) => `${v.value}` },
];

const LOG_OPTIONS: { vitalType: VitalType; label: string; fields: { key: string; placeholder: string }[] }[] = [
  { vitalType: 'blood_pressure', label: 'Blood pressure', fields: [{ key: 'systolic', placeholder: 'Upper (e.g. 128)' }, { key: 'diastolic', placeholder: 'Lower (e.g. 82)' }] },
  { vitalType: 'blood_sugar', label: 'Blood sugar', fields: [{ key: 'value', placeholder: 'mg/dL (e.g. 142)' }] },
  { vitalType: 'spo2', label: 'SpO2', fields: [{ key: 'value', placeholder: '% (e.g. 97)' }] },
];

export function DiagnosticsScreen() {
  // Health and life-story data: block screenshots, screen recording and the
  // app-switcher snapshot while this screen is focused.
  useProtectedScreen('DiagnosticsScreen');

  const { scale } = useFontScale();
  const userId = useCurrentUserId();
  const { data: vitals } = useVitals(userId);
  const { data: records } = useHealthRecords(userId);
  const addVital = useAddVitalReading();
  const uploadRecord = useUploadHealthRecord();

  const [logging, setLogging] = useState<VitalType | null>(null);
  const [entries, setEntries] = useState<Record<string, string>>({});

  const latestByType = useMemo(() => {
    const map = new Map<string, NonNullable<typeof vitals>[number]>();
    for (const v of vitals ?? []) if (!map.has(v.vital_type)) map.set(v.vital_type, v);
    return map;
  }, [vitals]);

  const active = LOG_OPTIONS.find((o) => o.vitalType === logging);

  function resetForm() {
    setLogging(null);
    setEntries({});
  }

  // These values go into a real health record a doctor and family may read, so
  // they must come from the senior — this used to submit hardcoded samples.
  function handleSave() {
    if (!userId || !active) return;

    const readingValues: Record<string, number> = {};
    for (const field of active.fields) {
      const parsed = Number(entries[field.key]);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        notify('Check the numbers', 'Please enter each reading as a number before saving.');
        return;
      }
      readingValues[field.key] = parsed;
    }

    addVital.mutate(
      { ownerId: userId, vitalType: active.vitalType, readingValues },
      {
        onSuccess: () => {
          notify('Saved', 'Your reading has been added.');
          resetForm();
        },
        onError: (e) => notify('Could not save', e instanceof Error ? e.message : 'Try again.'),
      }
    );
  }

  async function handleUploadRecord() {
    if (!userId) return;
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (result.canceled) return;
    const file = result.assets[0];
    uploadRecord.mutate(
      { ownerId: userId, recordType: 'health_document', fileUri: file.uri, fileName: file.name },
      { onError: (e) => notify('Upload failed', e instanceof Error ? e.message : 'Try again.') }
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Diagnostics" subtitle="Vitals, tests & health records" />

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

      {active ? (
        <View style={styles.logCard}>
          <Text style={[styles.logTitle, { fontSize: fontSize.body * scale }]}>Log your {active.label.toLowerCase()}</Text>
          {active.fields.map((field) => (
            <TextInput
              key={field.key}
              style={[styles.input, { fontSize: fontSize.body * scale }]}
              placeholder={field.placeholder}
              placeholderTextColor={colors.inkMuted}
              keyboardType="number-pad"
              value={entries[field.key] ?? ''}
              onChangeText={(text) => setEntries((prev) => ({ ...prev, [field.key]: text }))}
              accessibilityLabel={field.placeholder}
            />
          ))}
          <BigButton label="Save reading" onPress={handleSave} loading={addVital.isPending} />
          <BigButton label="Cancel" variant="secondary" onPress={resetForm} />
        </View>
      ) : (
        <View style={styles.logChoices}>
          {LOG_OPTIONS.map((option) => (
            <BigButton
              key={option.vitalType}
              label={`Log ${option.label.toLowerCase()}`}
              variant="secondary"
              onPress={() => setLogging(option.vitalType)}
              style={styles.logChoice}
            />
          ))}
        </View>
      )}

      {/* No lab partner is integrated yet, so this books nothing — say so
          rather than opening a form that goes nowhere. */}
      <ListRow
        icon="labTest"
        title="Book a lab test"
        subtitle="Home sample collection — coming soon"
        tint={colors.coralTint}
        onPress={() =>
          notify('Coming soon', 'Home sample collection is being set up with our diagnostic partners.')
        }
      />

      <SectionHeader title="Health records vault" />
      {(records ?? []).map((r) => (
        <ListRow
          key={r.id}
          icon="record"
          title={r.record_type.replace(/_/g, ' ')}
          subtitle={`Uploaded ${new Date(r.created_at).toLocaleDateString('en-IN')}`}
          tint={colors.greenTint}
        />
      ))}
      {!records?.length ? (
        <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>No records uploaded yet.</Text>
      ) : null}
      <BigButton label="Upload a record" onPress={handleUploadRecord} loading={uploadRecord.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.xs },
  logChoices: { gap: spacing.xs, marginBottom: spacing.sm },
  logChoice: { minHeight: minTouchTarget },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  logTitle: { color: colors.ink, fontWeight: '700' },
  input: {
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bg,
    color: colors.ink,
  },
  empty: { color: colors.inkMuted, marginBottom: spacing.sm },
});
