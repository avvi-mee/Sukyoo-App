import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { supabase, useSharedLifeStoryEntries } from '@sukyoo/core';
import { Row } from '../components/Row';
import { useActiveSenior } from '../state/ActiveSeniorContext';
import { colors, spacing } from '../theme/tokens';
import { useProtectedScreen } from '../hooks/useProtectedScreen';

type StoryEntry = { id: string; title: string; storage_path: string | null };

function NowPlaying({ entry }: { entry: StoryEntry }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!entry.storage_path) return;
    supabase.storage
      .from('life-stories')
      .createSignedUrl(entry.storage_path, 3600)
      .then(({ data }) => setSignedUrl(data?.signedUrl ?? null));
  }, [entry.storage_path]);

  const player = useAudioPlayer(signedUrl ?? undefined);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (signedUrl) player.play();
  }, [signedUrl]);

  return (
    <Row
      icon={status.playing ? 'pause' : 'play'}
      title={`Now playing: ${entry.title}`}
      subtitle={status.playing ? 'Playing...' : 'Paused'}
      onPress={() => (status.playing ? player.pause() : player.play())}
    />
  );
}

export function StoriesScreen() {
  // Health and life-story data: block screenshots, screen recording and the
  // app-switcher snapshot while this screen is focused.
  useProtectedScreen('StoriesScreen');

  const { activeSenior } = useActiveSenior();
  const { data: entries, isError } = useSharedLifeStoryEntries(activeSenior?.seniorId);
  const [nowPlaying, setNowPlaying] = useState<StoryEntry | null>(null);

  if (!activeSenior) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.center}>
        <Text style={styles.empty}>Link to a family member first (see Settings).</Text>
      </ScrollView>
    );
  }

  if (isError) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.center}>
        <Text style={styles.empty}>{activeSenior.name} hasn't shared their life stories with you yet.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{activeSenior.name}'s life stories</Text>
      {nowPlaying ? <NowPlaying entry={nowPlaying} /> : null}
      {(entries ?? [])
        .filter((e) => e.id !== nowPlaying?.id)
        .map((e) => (
          <Row key={e.id} icon="story" title={e.title} subtitle={new Date(e.created_at).toLocaleDateString()} onPress={() => setNowPlaying(e)} />
        ))}
      {!entries?.length ? <Text style={styles.empty}>No stories shared yet.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  heading: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: spacing.sm },
  empty: { color: colors.inkMuted, textAlign: 'center' },
});
