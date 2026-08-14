import { ScrollView, StyleSheet, Text } from 'react-native';
import { useEvents, useRsvpEvent } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, spacing } from '../../theme/tokens';

export function LocalEventsScreen() {
  const userId = useCurrentUserId();
  const { data: events } = useEvents();
  const rsvp = useRsvpEvent();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Local events" />
      {(events ?? []).map((e) => (
        <ListRow
          key={e.id}
          icon="📅"
          title={e.title}
          subtitle={`${new Date(e.starts_at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}${e.location_text ? ` · ${e.location_text}` : ''}`}
          actionLabel="Join"
          onPressAction={() => userId && rsvp.mutate({ eventId: e.id, userId })}
        />
      ))}
      {!events?.length ? <Text style={styles.empty}>No events scheduled right now.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs },
  empty: { color: colors.inkMuted },
});
