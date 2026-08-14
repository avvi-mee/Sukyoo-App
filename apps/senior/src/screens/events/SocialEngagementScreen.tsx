import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useClubs, useJoinClub } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, spacing } from '../../theme/tokens';

export function SocialEngagementScreen() {
  const userId = useCurrentUserId();
  const { data: clubs } = useClubs();
  const joinClub = useJoinClub();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Social engagement" />
      <ListRow icon="🙋" title="Volunteer this month" subtitle="Mentor a young reader nearby" tint={colors.greenTint} onPress={() => Alert.alert('Thanks!', "We'll be in touch with volunteering details.")} />

      <SectionHeader title="Interest-based clubs" />
      {(clubs ?? []).map((c) => (
        <ListRow
          key={c.id}
          icon="👥"
          title={c.name}
          subtitle={c.meeting_schedule ?? undefined}
          actionLabel="Join"
          onPressAction={() => userId && joinClub.mutate({ clubId: c.id, userId })}
        />
      ))}
      {!clubs?.length ? <Text style={styles.empty}>No clubs listed yet.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs },
  empty: { color: colors.inkMuted },
});
