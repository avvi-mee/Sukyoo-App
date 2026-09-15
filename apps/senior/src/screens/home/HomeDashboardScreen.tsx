import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useProfile, useUpcomingBooking } from '@sukyoo/core';
import { HeroBanner } from '../../components/HeroBanner';
import { Icon, type IconName } from '../../components/Icon';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { navigationRef } from '../../navigation/navigationRef';
import { colors, fontSize, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import type { MainTabParamList } from '../../navigation/types';

const VERTICALS: { key: keyof MainTabParamList; icon: IconName; title: string; subtitle: string; tint: string }[] = [
  { key: 'Health', icon: 'vitals', title: 'HealthHub', subtitle: 'Doctors, medicines, emergency care', tint: colors.coralTint },
  { key: 'Shop', icon: 'cart', title: 'Shop', subtitle: 'Essentials delivered to your door', tint: colors.greenTint },
  { key: 'Events', icon: 'events', title: 'Events / Tour', subtitle: 'Meetups, workshops & safe travel', tint: colors.amberTint },
  { key: 'Fun', icon: 'entertainment', title: 'Entertainment', subtitle: 'Movies, music, games & classes', tint: colors.redTint },
];

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeDashboardScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { scale } = useFontScale();
  const userId = useCurrentUserId();
  const { data: profile } = useProfile(userId);
  const { data: upcoming } = useUpcomingBooking(userId);

  const startAt = upcoming?.slot?.start_at ? new Date(upcoming.slot.start_at) : null;
  const doctorName = upcoming?.slot?.doctor?.profile?.full_name;
  const isToday = startAt ? startAt.toDateString() === new Date().toDateString() : false;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[styles.eyebrow, { fontSize: fontSize.body * scale }]}>{greeting(new Date().getHours())}</Text>
      <Text style={[styles.name, { fontSize: fontSize.headline * scale }]}>
        {profile?.full_name ? `Welcome, ${profile.full_name.split(' ')[0]}` : 'Welcome'}
      </Text>

      {upcoming && startAt ? (
        <HeroBanner
          accent="coral"
          icon="calendar"
          eyebrow={`${isToday ? 'Today' : startAt.toLocaleDateString('en-IN', { weekday: 'long' })}, ${startAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`}
          title={doctorName ? `${upcoming.mode.replace('_', ' ')} consult with ${doctorName}` : 'Upcoming consult'}
          subtitle={upcoming.slot?.doctor?.specialty ? `${upcoming.slot.doctor.specialty} · HealthHub` : 'HealthHub'}
          onPress={() => navigation.navigate('Health')}
          style={styles.hero}
        />
      ) : null}

      <SectionHeader title="Explore Sukyoo" />
      <View style={styles.list}>
        {VERTICALS.map((v) => (
          <ListRow
            key={v.key}
            icon={v.icon}
            title={v.title}
            subtitle={v.subtitle}
            tint={v.tint}
            onPress={() => navigation.navigate(v.key)}
            trailing={<Icon name="forward" size={20} color={colors.inkMuted} />}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  eyebrow: { color: colors.inkMuted },
  name: { color: colors.ink, fontWeight: '800', marginBottom: spacing.md },
  hero: { marginBottom: spacing.lg },
  list: { gap: spacing.xs },
});
