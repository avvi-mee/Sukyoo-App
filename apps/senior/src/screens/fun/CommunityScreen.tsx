import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFamilyLinks, useProfile } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, spacing } from '../../theme/tokens';
import type { FunStackParamList } from '../../navigation/types';

function daysUntilNextBirthday(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function CommunityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<FunStackParamList>>();
  const userId = useCurrentUserId();
  const { data: profile } = useProfile(userId);
  const { data: familyLinks } = useFamilyLinks(userId);

  const celebrations = useMemo(() => {
    const people = [
      ...(profile?.date_of_birth ? [{ name: 'You', date_of_birth: profile.date_of_birth }] : []),
      ...(familyLinks ?? [])
        .filter((l) => l.family_member?.date_of_birth)
        .map((l) => ({ name: l.family_member!.full_name ?? 'Family', date_of_birth: l.family_member!.date_of_birth! })),
    ];
    return people
      .map((p) => ({ ...p, daysUntil: daysUntilNextBirthday(p.date_of_birth) }))
      .filter((p) => p.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [profile, familyLinks]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Community" />
      <ListRow icon="💬" title="Discussion forums" subtitle="Join conversations by interest — coming soon" />
      <ListRow
        icon="📖"
        title="Record your life story"
        subtitle="Leave a legacy for your family"
        tint={colors.greenTint}
        onPress={() => navigation.navigate('LifeStoryRecorder')}
      />

      <SectionHeader title="Celebrations" />
      {celebrations.map((c) => (
        <ListRow key={c.name} icon="🎂" title={c.name} subtitle={c.daysUntil === 0 ? 'Today!' : `In ${c.daysUntil} day${c.daysUntil === 1 ? '' : 's'}`} />
      ))}
      {!celebrations.length ? <Text style={styles.empty}>No birthdays in your circle this month.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs },
  empty: { color: colors.inkMuted },
});
