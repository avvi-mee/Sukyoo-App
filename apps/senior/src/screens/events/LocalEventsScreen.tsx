import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useEvents, useRsvpEvent } from '@sukyoo/core';
import { FilterChips } from '../../components/FilterChips';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, fontSize, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

type EventFilter = 'this_week' | 'cultural' | 'health_camp';

const FILTERS: readonly { key: EventFilter; label: string }[] = [
  { key: 'this_week', label: 'This week' },
  { key: 'cultural', label: 'Cultural' },
  { key: 'health_camp', label: 'Health camps' },
] as const;

// A health camp asks you to register; everything else you just say yes to.
const ACTION_LABEL: Record<string, string> = { health_camp: 'Register' };

export function LocalEventsScreen() {
  const { scale } = useFontScale();
  const userId = useCurrentUserId();
  const { data: events, isLoading } = useEvents();
  const rsvp = useRsvpEvent();
  const [filter, setFilter] = useState<EventFilter>('this_week');

  const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const visible = (events ?? []).filter((e) => {
    if (filter === 'this_week') {
      const at = new Date(e.starts_at).getTime();
      return at >= Date.now() && at <= weekFromNow;
    }
    return e.category === filter;
  });

  function handleRsvp(eventId: string, title: string) {
    if (!userId) return;
    rsvp.mutate(
      { eventId, userId },
      {
        onSuccess: () => notify("You're going", `We've saved your place at ${title}.`),
        onError: (e) => notify('Could not RSVP', e instanceof Error ? e.message : 'Try again.'),
      }
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Local events" subtitle="Happening near you" />
      <FilterChips chips={FILTERS} selected={filter} onSelect={setFilter} accent={colors.amber} />

      {visible.map((e) => {
        const startAt = new Date(e.starts_at);
        return (
          <ListRow
            key={e.id}
            icon="calendar"
            title={e.title}
            subtitle={`${startAt.toLocaleDateString('en-IN', { weekday: 'short' })}, ${startAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}${e.location_text ? ` · ${e.location_text}` : ''}`}
            tint={colors.amberTint}
            actionLabel={ACTION_LABEL[e.category ?? ''] ?? 'RSVP'}
            onPressAction={() => handleRsvp(e.id, e.title)}
          />
        );
      })}

      {!isLoading && !visible.length ? (
        <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>
          {filter === 'this_week' ? 'Nothing scheduled in the next week.' : 'No events in this category right now.'}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl * 2 },
  empty: { color: colors.inkMuted },
});
