import { ScrollView, StyleSheet, Text } from 'react-native';
import { useEnrollWellnessProgram, useEnrollWellnessSession, useWellnessPrograms, useWellnessSessions } from '@sukyoo/core';
import { HeroBanner } from '../../components/HeroBanner';
import type { IconName } from '../../components/Icon';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, fontSize, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

const PROGRAM_ICON: Record<string, IconName> = {
  'Diet & nutrition consult': 'learning',
  'Mind & emotional wellbeing': 'community',
  'Diabetes management plan': 'vitals',
};

export function WellnessScreen() {
  const { scale } = useFontScale();
  const userId = useCurrentUserId();
  const { data: sessions } = useWellnessSessions();
  const { data: programs } = useWellnessPrograms();
  const enrollSession = useEnrollWellnessSession();
  const enrollProgram = useEnrollWellnessProgram();

  // The soonest session becomes the hero; the rest fall through to the list so
  // nothing is hidden.
  const upcoming = [...(sessions ?? [])].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );
  const [nextSession, ...laterSessions] = upcoming;

  function sessionWhen(startsAt: string) {
    const date = new Date(startsAt);
    const isToday = date.toDateString() === new Date().toDateString();
    const day = isToday ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'long' });
    return `Live session · ${day}, ${date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Wellness" subtitle="Stay active, stay well" />

      {nextSession ? (
        <HeroBanner
          accent="green"
          icon="wellness"
          title={nextSession.title}
          subtitle={sessionWhen(nextSession.starts_at)}
          actionLabel="Join"
          onPressAction={() =>
            userId &&
            enrollSession.mutate(
              { sessionId: nextSession.id, userId },
              {
                onSuccess: () => notify('You’re in', `We’ll remind you before ${nextSession.title} starts.`),
                onError: (e) => notify('Could not join', e instanceof Error ? e.message : 'Try again.'),
              }
            )
          }
        />
      ) : null}

      {laterSessions.map((s) => (
        <ListRow
          key={s.id}
          icon="wellness"
          title={s.title}
          subtitle={sessionWhen(s.starts_at)}
          tint={colors.greenTint}
          actionLabel="Join"
          onPressAction={() => userId && enrollSession.mutate({ sessionId: s.id, userId })}
        />
      ))}

      <SectionHeader title="Programs for you" />
      {(programs ?? []).map((p) => (
        <ListRow
          key={p.id}
          icon={PROGRAM_ICON[p.title] ?? 'learning'}
          title={p.title}
          subtitle={p.description ?? (p.duration_weeks ? `${p.duration_weeks}-week guided program` : undefined)}
          actionLabel="Enroll"
          onPressAction={() =>
            userId &&
            enrollProgram.mutate(
              { programId: p.id, userId },
              {
                onSuccess: () => notify('Enrolled', `You’re signed up for ${p.title}.`),
                onError: (e) => notify('Could not enroll', e instanceof Error ? e.message : 'Try again.'),
              }
            )
          }
        />
      ))}
      {!programs?.length ? (
        <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>No programs available right now.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.xs },
  empty: { color: colors.inkMuted },
});
