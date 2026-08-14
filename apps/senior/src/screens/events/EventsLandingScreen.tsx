import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ModuleGridTile } from '../../components/ModuleGridTile';
import { SectionHeader } from '../../components/SectionHeader';
import { colors, spacing } from '../../theme/tokens';
import type { EventsStackParamList } from '../../navigation/types';

const MODULES: { key: keyof EventsStackParamList; icon: string; title: string; subtitle: string }[] = [
  { key: 'LocalEvents', icon: '📍', title: 'Local events', subtitle: 'Walks, workshops & health camps' },
  { key: 'TravelTours', icon: '✈️', title: 'Travel & tours', subtitle: 'Accessible group trips' },
  { key: 'SocialEngagement', icon: '🎲', title: 'Social engagement', subtitle: 'Clubs & volunteering' },
  { key: 'Logistics', icon: '🚐', title: 'Logistics support', subtitle: 'Accessible transport & coordinators' },
];

export function EventsLandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<EventsStackParamList>>();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Events & Tours" subtitle="Heritage walk & breakfast — this Saturday, 8 AM" />
      <View style={styles.grid}>
        {MODULES.map((m) => (
          <ModuleGridTile key={m.key} icon={m.icon} title={m.title} subtitle={m.subtitle} tint={colors.amberTint} onPress={() => navigation.navigate(m.key as any)} />
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
