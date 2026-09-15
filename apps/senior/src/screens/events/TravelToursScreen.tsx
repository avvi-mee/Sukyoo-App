import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTravelTrips } from '@sukyoo/core';
import { BigButton } from '../../components/BigButton';
import { Icon } from '../../components/Icon';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import type { EventsStackParamList } from '../../navigation/types';

export function TravelToursScreen() {
  const { scale } = useFontScale();
  const navigation = useNavigation<NativeStackNavigationProp<EventsStackParamList>>();
  const { data: trips, isLoading } = useTravelTrips();

  const firstTrip = trips?.[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Travel & tours" subtitle="Safe journeys, good company" />

      {/* Companion matching is per-trip — you opt in on a trip you've booked —
          so this points at the first trip rather than pretending to be a
          standalone matching service. */}
      {firstTrip ? (
        <View style={styles.companionCard}>
          <View style={styles.companionTitleRow}>
            <Icon name="profile" size={22 * scale} color="#fff" />
            <Text style={[styles.companionTitle, { fontSize: fontSize.body * scale }]}>Find a travel companion</Text>
          </View>
          <Text style={[styles.companionSubtitle, { fontSize: fontSize.label * scale }]}>
            Match with fellow travellers on any trip you book
          </Text>
          <Text
            accessibilityRole="button"
            onPress={() => navigation.navigate('TripCompanions', { tripId: firstTrip.id, tripTitle: firstTrip.title })}
            style={[styles.companionAction, { fontSize: fontSize.label * scale }]}
          >
            See who's going →
          </Text>
        </View>
      ) : null}

      {(trips ?? []).map((t) => (
        <View key={t.id} style={styles.card}>
          <View style={styles.head}>
            <View style={styles.iconWrap}>
              <Icon name="travel" size={22 * scale} color={colors.green} />
            </View>
            <View style={styles.text}>
              <Text style={[styles.title, { fontSize: fontSize.body * scale }]}>{t.title}</Text>
              <Text style={[styles.meta, { fontSize: fontSize.label * scale }]}>
                {t.duration_days ? `${t.duration_days} days` : 'Duration TBC'}
                {t.accessibility_notes ? ` · ${t.accessibility_notes}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.footer}>
            {t.price ? (
              <Text style={[styles.price, { fontSize: fontSize.body * scale }]}>₹{t.price.toLocaleString('en-IN')}</Text>
            ) : (
              <Text style={[styles.meta, { fontSize: fontSize.label * scale }]}>Price on request</Text>
            )}
            <BigButton
              label="View trip"
              onPress={() => navigation.navigate('TripCompanions', { tripId: t.id, tripTitle: t.title })}
              style={styles.view}
            />
          </View>
        </View>
      ))}

      {!isLoading && !trips?.length ? (
        <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>No trips listed right now.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  companionCard: { backgroundColor: colors.ink, borderRadius: radii.card, padding: spacing.md, gap: 4 },
  companionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  companionTitle: { color: '#fff', fontWeight: '800' },
  companionSubtitle: { color: '#D9D2C8' },
  companionAction: { color: colors.amber, fontWeight: '800', marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.card,
    backgroundColor: colors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  title: { color: colors.ink, fontWeight: '800' },
  meta: { color: colors.inkMuted },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  price: { color: colors.coral, fontWeight: '800' },
  view: { paddingHorizontal: spacing.lg, minHeight: 48 },
  empty: { color: colors.inkMuted },
});
