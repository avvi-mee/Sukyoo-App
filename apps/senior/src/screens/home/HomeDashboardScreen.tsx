import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFamilyLinks, useUpcomingBooking } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { navigationRef } from '../../navigation/navigationRef';
import { colors, spacing } from '../../theme/tokens';
import type { MainTabParamList } from '../../navigation/types';

const VERTICALS: { key: keyof MainTabParamList; icon: string; title: string; subtitle: string; tint: string }[] = [
  { key: 'Health', icon: '🩺', title: 'HealthHub', subtitle: 'Doctors, medicines, emergency care', tint: colors.coralTint },
  { key: 'Shop', icon: '🛒', title: 'Shop', subtitle: 'Medicines, groceries & essentials', tint: colors.greenTint },
  { key: 'Events', icon: '🎉', title: 'Events & Tours', subtitle: 'Local events, travel, clubs', tint: colors.amberTint },
  { key: 'Fun', icon: '🎬', title: 'Entertainment', subtitle: 'Movies, games, video calls', tint: colors.redTint },
];

export function HomeDashboardScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const userId = useCurrentUserId();
  const { data: upcoming } = useUpcomingBooking(userId);
  const { data: familyLinks } = useFamilyLinks(userId);
  const firstFamilyMember = familyLinks?.[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Welcome to Sukyoo" subtitle="Everything that matters, in one place." />

      {firstFamilyMember ? (
        <ListRow
          icon="📹"
          title={`Video call ${firstFamilyMember.family_member?.full_name ?? 'family'}`}
          subtitle="One tap to call your favourites"
          tint={colors.redTint}
          onPress={() =>
            navigationRef.navigate('VideoCall', {
              mode: 'start',
              calleeId: firstFamilyMember.family_member_id,
              calleeName: firstFamilyMember.family_member?.full_name ?? 'Family',
            })
          }
        />
      ) : null}

      {upcoming ? (
        <ListRow
          icon="📅"
          title={`Upcoming: ${upcoming.slot?.doctor?.profile?.full_name ?? 'Doctor consult'}`}
          subtitle={`${new Date(upcoming.slot?.start_at ?? upcoming.created_at).toLocaleString()} · ${upcoming.mode.replace('_', ' ')}`}
          tint={colors.coralTint}
        />
      ) : null}

      <View style={styles.grid}>
        {VERTICALS.map((v) => (
          <ListRow key={v.key} icon={v.icon} title={v.title} subtitle={v.subtitle} tint={v.tint} onPress={() => navigation.navigate(v.key)} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  grid: { gap: spacing.xs },
});
