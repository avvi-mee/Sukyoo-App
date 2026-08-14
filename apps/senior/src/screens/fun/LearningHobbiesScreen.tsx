import { ScrollView, StyleSheet, Text } from 'react-native';
import { useClasses, useEnrollClass } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, spacing } from '../../theme/tokens';

export function LearningHobbiesScreen() {
  const userId = useCurrentUserId();
  const { data: classes } = useClasses();
  const enroll = useEnrollClass();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Learning & hobbies" />
      {(classes ?? []).map((c) => (
        <ListRow
          key={c.id}
          icon="📚"
          title={c.title}
          subtitle={[c.schedule_text, c.instructor].filter(Boolean).join(' · ') || undefined}
          actionLabel="Enroll"
          onPressAction={() => userId && enroll.mutate({ classId: c.id, userId })}
        />
      ))}
      {!classes?.length ? <Text style={styles.empty}>No classes scheduled yet.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs },
  empty: { color: colors.inkMuted },
});
