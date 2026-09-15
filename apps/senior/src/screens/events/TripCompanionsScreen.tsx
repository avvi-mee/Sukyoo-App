import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useBookTrip, useMyTripBooking, useTripCompanions } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import type { EventsStackParamList } from '../../navigation/types';

export function TripCompanionsScreen() {
  const { scale } = useFontScale();
  const { params } = useRoute<RouteProp<EventsStackParamList, 'TripCompanions'>>();
  const userId = useCurrentUserId();
  const bookTrip = useBookTrip();
  const { data: myBooking } = useMyTripBooking(params.tripId, userId);
  const { data: companions } = useTripCompanions(params.tripId, userId);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title={params.tripTitle} subtitle="Safe journeys, good company" />

      <View style={styles.toggleRow}>
        <View style={styles.toggleText}>
          <Text style={[styles.toggleLabel, { fontSize: fontSize.body * scale }]}>Looking for a travel companion</Text>
          <Text style={[styles.toggleHint, { fontSize: fontSize.label * scale }]}>
            Others on this trip will see your name
          </Text>
        </View>
        <Switch
          value={myBooking?.seeking_companion ?? false}
          onValueChange={(value) => {
            if (userId) bookTrip.mutate({ tripId: params.tripId, userId, seekingCompanion: value });
          }}
          trackColor={{ true: colors.amber }}
          accessibilityLabel="Looking for a travel companion"
        />
      </View>

      <SectionHeader title="Fellow travellers" />
      {(companions ?? []).map((c) => (
        <ListRow
          key={c.user_id}
          icon="profile"
          title={c.profile?.full_name ?? 'A fellow traveller'}
          tint={colors.amberTint}
        />
      ))}
      {!companions?.length ? (
        <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>
          No one else is looking yet — check back soon.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl * 2 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: minTouchTarget,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { color: colors.ink, fontWeight: '700' },
  toggleHint: { color: colors.inkMuted },
  empty: { color: colors.inkMuted },
});
