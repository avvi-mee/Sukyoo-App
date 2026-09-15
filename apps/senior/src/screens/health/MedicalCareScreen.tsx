import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BookingMode } from '@sukyoo/core';
import { useDoctorModes, useDoctors } from '@sukyoo/core';
import { FilterChips } from '../../components/FilterChips';
import { Icon } from '../../components/Icon';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import type { HealthStackParamList } from '../../navigation/types';

type ModeFilter = BookingMode | 'all';

const FILTERS: readonly { key: ModeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'video', label: 'Video' },
  { key: 'in_person', label: 'In-person' },
  { key: 'home_visit', label: 'Home visit' },
] as const;

const MODE_LABEL: Record<BookingMode, string> = {
  video: 'Video',
  in_person: 'In-person',
  home_visit: 'Home visit',
};

export function MedicalCareScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HealthStackParamList>>();
  const { scale } = useFontScale();
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');

  const { data: doctors, isLoading } = useDoctors({ mode: modeFilter === 'all' ? undefined : modeFilter });
  const doctorIds = useMemo(() => (doctors ?? []).map((d) => d.user_id), [doctors]);
  const { data: modesByDoctor } = useDoctorModes(doctorIds);

  // Name and speciality both matter here — a senior searching "heart" should
  // find the cardiologist, and searching "Nair" should find Dr. Nair. The
  // server-side filter only covers speciality, so this runs over both.
  const query = search.trim().toLowerCase();
  const visible = query
    ? (doctors ?? []).filter((d) =>
        `${d.profile?.full_name ?? ''} ${d.specialty ?? ''}`.toLowerCase().includes(query)
      )
    : doctors ?? [];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <ScreenHeader title="Medical care" subtitle="Consult & book doctors" />
        <TextInput
          style={[styles.search, { fontSize: fontSize.body * scale }]}
          placeholder="Search doctor, speciality..."
          placeholderTextColor={colors.inkMuted}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search doctors"
        />
        <FilterChips chips={FILTERS} selected={modeFilter} onSelect={setModeFilter} />
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={visible}
        keyExtractor={(item) => item.user_id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !isLoading ? (
            <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>
              {modeFilter === 'all'
                ? 'No doctors available right now.'
                : `No doctor has a ${MODE_LABEL[modeFilter].toLowerCase()} slot open right now.`}
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          // Only offer modes this doctor genuinely has open slots for.
          const available = modesByDoctor?.get(item.user_id) ?? [];
          const offered = modeFilter === 'all' ? available : available.filter((m) => m === modeFilter);

          return (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.avatar}>
                  <Icon name="profile" size={22 * scale} color={colors.coral} />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.name, { fontSize: fontSize.body * scale }]} numberOfLines={2}>
                    {item.profile?.full_name ?? 'Doctor'}
                  </Text>
                  <Text style={[styles.meta, { fontSize: fontSize.label * scale }]} numberOfLines={2}>
                    {item.specialty ?? 'General physician'}
                    {item.years_experience ? ` · ${item.years_experience} yrs exp` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                {offered.length ? (
                  offered.map((mode) => (
                    <Pressable
                      key={mode}
                      accessibilityRole="button"
                      accessibilityLabel={`Book ${MODE_LABEL[mode]} with ${item.profile?.full_name ?? 'doctor'}`}
                      onPress={() =>
                        navigation.navigate('DoctorSlots', {
                          doctorId: item.user_id,
                          doctorName: item.profile?.full_name ?? 'Doctor',
                          mode,
                        })
                      }
                      style={({ pressed }) => [
                        styles.modeButton,
                        mode === 'video' ? styles.modeButtonPrimary : styles.modeButtonSecondary,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeLabel,
                          { fontSize: fontSize.label * scale, color: mode === 'video' ? '#fff' : colors.ink },
                        ]}
                      >
                        {MODE_LABEL[mode]}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={[styles.noSlots, { fontSize: fontSize.label * scale }]}>No open slots right now</Text>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.md, paddingBottom: 0 },
  search: {
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.chip,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  list: { padding: spacing.md, paddingTop: 0, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.card,
    backgroundColor: colors.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 2 },
  name: { color: colors.ink, fontWeight: '800' },
  meta: { color: colors.inkMuted },
  actionRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  modeButton: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: minTouchTarget * 0.85,
    borderRadius: radii.chip,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  modeButtonPrimary: { backgroundColor: colors.coral },
  modeButtonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  modeLabel: { fontWeight: '800' },
  noSlots: { color: colors.inkMuted },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: spacing.lg },
});
