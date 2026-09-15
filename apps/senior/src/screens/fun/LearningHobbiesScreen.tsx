import { ScrollView, StyleSheet, Text } from 'react-native';
import { useClasses, useEnrollClass } from '@sukyoo/core';
import type { IconName } from '../../components/Icon';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, fontSize, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

// Keyed off the schedule text's leading category ("Language · Tue & Thu, 5 PM").
const SUBJECT_ICON: Record<string, IconName> = {
  language: 'learning',
  music: 'music',
  'digital literacy': 'device',
  hobby: 'art',
};

function iconFor(scheduleText: string | null): IconName {
  const subject = scheduleText?.split('·')[0]?.trim().toLowerCase() ?? '';
  return SUBJECT_ICON[subject] ?? 'learning';
}

export function LearningHobbiesScreen() {
  const { scale } = useFontScale();
  const userId = useCurrentUserId();
  const { data: classes, isLoading } = useClasses();
  const enroll = useEnrollClass();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Learning & hobbies" subtitle="Never stop growing" />

      {(classes ?? []).map((c) => (
        <ListRow
          key={c.id}
          icon={iconFor(c.schedule_text)}
          title={c.title}
          subtitle={[c.schedule_text, c.instructor].filter(Boolean).join(' · ') || undefined}
          tint={colors.greenTint}
          actionLabel="Enroll"
          onPressAction={() =>
            userId &&
            enroll.mutate(
              { classId: c.id, userId },
              {
                onSuccess: () => notify('Enrolled', `You're signed up for ${c.title}.`),
                onError: (e) => notify('Could not enroll', e instanceof Error ? e.message : 'Try again.'),
              }
            )
          }
        />
      ))}

      {!isLoading && !classes?.length ? (
        <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>No classes scheduled yet.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl * 2 },
  empty: { color: colors.inkMuted },
});
