import { ScrollView, StyleSheet } from 'react-native';
import { useEnrollWellnessProgram, useEnrollWellnessSession, useWellnessPrograms, useWellnessSessions } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, spacing } from '../../theme/tokens';

export function WellnessScreen() {
  const userId = useCurrentUserId();
  const { data: sessions } = useWellnessSessions();
  const { data: programs } = useWellnessPrograms();
  const enrollSession = useEnrollWellnessSession();
  const enrollProgram = useEnrollWellnessProgram();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Wellness programs" />
      {(sessions ?? []).map((s) => (
        <ListRow
          key={s.id}
          icon="🧘"
          title={s.title}
          subtitle={new Date(s.starts_at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
          tint={colors.greenTint}
          actionLabel="Join"
          onPressAction={() => userId && enrollSession.mutate({ sessionId: s.id, userId })}
        />
      ))}

      <SectionHeader title="Programs for you" />
      {(programs ?? []).map((p) => (
        <ListRow
          key={p.id}
          icon="📘"
          title={p.title}
          subtitle={p.duration_weeks ? `${p.duration_weeks}-week guided program` : p.description ?? undefined}
          actionLabel="Enroll"
          onPressAction={() => userId && enrollProgram.mutate({ programId: p.id, userId })}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs },
});
