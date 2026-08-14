import { ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTravelTrips } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { colors, spacing } from '../../theme/tokens';
import type { EventsStackParamList } from '../../navigation/types';

export function TravelToursScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<EventsStackParamList>>();
  const { data: trips } = useTravelTrips();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Travel & tours" subtitle="Find a travel companion — match with fellow travellers on the trip you pick" />
      {(trips ?? []).map((t) => (
        <ListRow
          key={t.id}
          icon="✈️"
          title={t.title}
          subtitle={`${t.duration_days ?? '?'} days${t.price ? ` · ₹${t.price.toLocaleString('en-IN')}` : ''}${t.accessibility_notes ? ` · ${t.accessibility_notes}` : ''}`}
          actionLabel="View trip"
          onPressAction={() => navigation.navigate('TripCompanions', { tripId: t.id, tripTitle: t.title })}
        />
      ))}
      {!trips?.length ? <Text style={styles.empty}>No trips listed right now.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs },
  empty: { color: colors.inkMuted },
});
