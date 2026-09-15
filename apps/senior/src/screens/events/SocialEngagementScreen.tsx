import { ScrollView, StyleSheet, Text } from 'react-native';
import { useClubs, useJoinClub } from '@sukyoo/core';
import { HeroBanner } from '../../components/HeroBanner';
import type { IconName } from '../../components/Icon';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, fontSize, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

const CLUB_ICON: Record<string, IconName> = {
  reading: 'learning',
  games: 'chess',
  music: 'music',
};

export function SocialEngagementScreen() {
  const { scale } = useFontScale();
  const userId = useCurrentUserId();
  const { data: clubs, isLoading } = useClubs();
  const joinClub = useJoinClub();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Social engagement" subtitle="Find your circle" />

      {/* Volunteering has no signup table yet — this registers interest with
          the care team rather than pretending to enrol anyone. */}
      <HeroBanner
        accent="green"
        icon="volunteer"
        title="Volunteer this month"
        subtitle="Tell us you're interested and we'll call you"
        onPress={() => notify('Thanks!', "We'll be in touch with volunteering details.")}
      />

      <SectionHeader title="Interest-based clubs" />
      {(clubs ?? []).map((c) => (
        <ListRow
          key={c.id}
          icon={CLUB_ICON[c.category ?? ''] ?? 'clubs'}
          title={c.name}
          subtitle={c.meeting_schedule ?? undefined}
          tint={colors.amberTint}
          actionLabel="Join"
          onPressAction={() =>
            userId &&
            joinClub.mutate(
              { clubId: c.id, userId },
              {
                onSuccess: () => notify('Joined', `You're now part of ${c.name}.`),
                onError: (e) => notify('Could not join', e instanceof Error ? e.message : 'Try again.'),
              }
            )
          }
        />
      ))}

      {!isLoading && !clubs?.length ? (
        <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>No clubs listed yet.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl * 2 },
  empty: { color: colors.inkMuted },
});
