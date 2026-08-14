import { ScrollView, StyleSheet, Text } from 'react-native';
import { useContentItems } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { colors, spacing } from '../../theme/tokens';

const CATEGORIES: { key: string; title: string; icon: string; note: string }[] = [
  { key: 'nostalgia_cinema', title: 'Nostalgia cinema', icon: '🎞️', note: 'Classic Hindi & regional films' },
  { key: 'devotional_music', title: 'Devotional & classical', icon: '🎵', note: 'Curated music playlists' },
  { key: 'audiobook', title: 'Audiobooks & podcasts', icon: '🎧', note: 'Large-print, audio-first library' },
  { key: 'live_radio', title: 'Live TV & radio', icon: '📻', note: 'Live channels' },
];

export function DigitalContentScreen() {
  const { data: items } = useContentItems();
  const countByCategory = new Map<string, number>();
  for (const item of items ?? []) countByCategory.set(item.category ?? '', (countByCategory.get(item.category ?? '') ?? 0) + 1);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Digital content" />
      {CATEGORIES.map((c) => (
        <ListRow key={c.key} icon={c.icon} title={c.title} subtitle={countByCategory.get(c.key) ? c.note : `${c.note} — coming soon`} />
      ))}
      <Text style={styles.footnote}>Content library launches as licensing partnerships close.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs },
  footnote: { color: colors.inkMuted, marginTop: spacing.sm, textAlign: 'center' },
});
