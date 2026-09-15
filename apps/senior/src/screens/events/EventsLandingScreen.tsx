import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEvents } from '@sukyoo/core';
import { HeroBanner } from '../../components/HeroBanner';
import type { IconName } from '../../components/Icon';
import { ModuleGridTile } from '../../components/ModuleGridTile';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing } from '../../theme/tokens';
import type { EventsStackParamList } from '../../navigation/types';

const MODULES: { key: keyof EventsStackParamList; icon: IconName; title: string; subtitle: string }[] = [
  { key: 'LocalEvents', icon: 'calendar', title: 'Local events', subtitle: 'Meetups, workshops & festivals' },
  { key: 'TravelTours', icon: 'travel', title: 'Travel & tours', subtitle: 'Senior-friendly group trips' },
  { key: 'SocialEngagement', icon: 'clubs', title: 'Social engagement', subtitle: 'Clubs & volunteering' },
  { key: 'Logistics', icon: 'transport', title: 'Logistics support', subtitle: 'Transport & coordinators' },
];

export function EventsLandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<EventsStackParamList>>();
  const { data: events } = useEvents();

  // The next event that hasn't started yet — the header used to hardcode one.
  const nextEvent = [...(events ?? [])]
    .filter((e) => new Date(e.starts_at).getTime() > Date.now())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];

  const startAt = nextEvent ? new Date(nextEvent.starts_at) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Events / Tour" subtitle="Stay connected, stay curious" />

      {nextEvent && startAt ? (
        <HeroBanner
          accent="amber"
          icon="calendar"
          eyebrow={`${startAt.toLocaleDateString('en-IN', { weekday: 'long' })}, ${startAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`}
          title={nextEvent.title}
          subtitle={nextEvent.location_text ?? undefined}
          onPress={() => navigation.navigate('LocalEvents')}
        />
      ) : null}

      <View style={styles.grid}>
        {MODULES.map((m) => (
          <ModuleGridTile
            key={m.key}
            icon={m.icon}
            title={m.title}
            subtitle={m.subtitle}
            tint={colors.amberTint}
            onPress={() => navigation.navigate(m.key as any)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
