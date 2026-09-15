import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { supabase, useAddLifeStoryEntry, useLifeStoryEntries } from '@sukyoo/core';
import { BigButton } from '../../components/BigButton';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, spacing } from '../../theme/tokens';
import { useProtectedScreen } from '../../hooks/useProtectedScreen';

export function LifeStoryRecorderScreen() {
  // Health and life-story data: block screenshots, screen recording and the
  // app-switcher snapshot while this screen is focused.
  useProtectedScreen('LifeStoryRecorderScreen');

  const userId = useCurrentUserId();
  const { data: entries } = useLifeStoryEntries(userId);
  const addEntry = useAddLifeStoryEntry();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync().then((status) => {
      if (!status.granted) notify('Microphone needed', 'Allow microphone access to record your story.');
    });
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
  }, []);

  async function handleStart() {
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function handleStopAndSave() {
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri || !userId) return;
    setSaving(true);
    try {
      const path = `${userId}/${Date.now()}.m4a`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage.from('life-stories').upload(path, blob);
      if (uploadError) throw uploadError;
      await addEntry.mutateAsync({ ownerId: userId, title: title || 'Untitled story', entryType: 'audio', storagePath: path });
      setTitle('');
    } catch (e) {
      notify('Could not save recording', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Record your life story" subtitle="Leave a legacy for your family" />

      <TextInput
        style={styles.input}
        placeholder="Give this story a title"
        placeholderTextColor={colors.inkMuted}
        value={title}
        onChangeText={setTitle}
      />

      {recorderState.isRecording ? (
        <View style={styles.recordingRow}>
          <Text style={styles.recordingText}>● Recording — {Math.round(recorderState.durationMillis / 1000)}s</Text>
          <BigButton label="Stop & save" variant="danger" onPress={handleStopAndSave} loading={saving} />
        </View>
      ) : (
        <BigButton label="Start recording" onPress={handleStart} disabled={saving} />
      )}

      <SectionHeader title="Your stories" />
      {(entries ?? []).map((e) => (
        <ListRow key={e.id} icon="story" title={e.title} subtitle={new Date(e.created_at).toLocaleDateString()} />
      ))}
      {!entries?.length ? <Text style={styles.empty}>No stories recorded yet.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  // color is required, not cosmetic: without it a TextInput falls back to a
  // native default that Android's system-wide "force dark" feature can invert
  // to near-white on this white surface, making typed text invisible.
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  recordingRow: { gap: spacing.sm },
  recordingText: { color: colors.statusHigh, fontWeight: '700', textAlign: 'center' },
  empty: { color: colors.inkMuted },
});
