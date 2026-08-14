import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BookingMode } from '@sukyoo/core';
import { useDoctors } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import type { HealthStackParamList } from '../../navigation/types';

const FILTERS: { key: BookingMode | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'video', label: 'Video' },
  { key: 'in_person', label: 'In-person' },
  { key: 'home_visit', label: 'Home visit' },
];

export function MedicalCareScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HealthStackParamList>>();
  const { scale } = useFontScale();
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<BookingMode | 'all'>('all');
  const { data: doctors, isLoading } = useDoctors({ specialty: search || undefined });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <SectionHeader title="Medical care" subtitle="Find a doctor and book a consult" />
        <TextInput
          style={[styles.search, { fontSize: fontSize.body * scale }]}
          placeholder="Search doctor, speciality..."
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Text
              key={f.key}
              onPress={() => setModeFilter(f.key)}
              style={[
                styles.chip,
                { fontSize: fontSize.label * scale },
                modeFilter === f.key && styles.chipActive,
              ]}
            >
              {f.label}
            </Text>
          ))}
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={doctors ?? []}
        keyExtractor={(item) => item.user_id}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No doctors found.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <ListRow
              icon="👩‍⚕️"
              title={item.profile?.full_name ?? 'Doctor'}
              subtitle={`${item.specialty ?? 'General physician'} · ${item.years_experience ?? 0} yrs exp`}
            />
            <View style={styles.actionRow}>
              {(['video', 'in_person'] as BookingMode[])
                .filter((m) => modeFilter === 'all' || modeFilter === m)
                .map((mode) => (
                  <Text
                    key={mode}
                    onPress={() =>
                      navigation.navigate('DoctorSlots', {
                        doctorId: item.user_id,
                        doctorName: item.profile?.full_name ?? 'Doctor',
                        mode,
                      })
                    }
                    style={[styles.modeButton, { fontSize: fontSize.label * scale }]}
                  >
                    {mode === 'video' ? 'Video' : 'In-person'}
                  </Text>
                ))}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.md, paddingBottom: 0 },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  filterRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.inkMuted,
    overflow: 'hidden',
  },
  chipActive: { backgroundColor: colors.coral, color: '#fff', borderColor: colors.coral },
  list: { padding: spacing.md, paddingTop: 0, gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  modeButton: {
    backgroundColor: colors.ink,
    color: '#fff',
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    overflow: 'hidden',
  },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: spacing.lg },
});
