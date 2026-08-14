import { Switch, StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useBookTrip, useTripCompanions } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, fontSize, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import type { EventsStackParamList } from '../../navigation/types';

export function TripCompanionsScreen() {
  const { scale } = useFontScale();
  const { params } = useRoute<RouteProp<EventsStackParamList, 'TripCompanions'>>();
  const userId = useCurrentUserId();
  const bookTrip = useBookTrip();
  const { data: companions } = useTripCompanions(params.tripId, userId);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <SectionHeader title={params.tripTitle} />
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { fontSize: fontSize.body * scale }]}>Looking for a travel companion</Text>
          <Switch
            onValueChange={(value) => {
              if (userId) bookTrip.mutate({ tripId: params.tripId, userId, seekingCompanion: value });
            }}
            trackColor={{ true: colors.amber }}
          />
        </View>
      </View>
      <SectionHeader title="Fellow travellers seeking a companion" />
      {(companions ?? []).map((c) => (
        <ListRow key={c.user_id} icon="🧑‍🤝‍🧑" title={c.profile?.full_name ?? 'A fellow traveller'} />
      ))}
      {!companions?.length ? <Text style={styles.empty}>No one else is looking yet — check back soon.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { color: colors.ink, fontWeight: '600', flex: 1 },
  empty: { color: colors.inkMuted },
});
