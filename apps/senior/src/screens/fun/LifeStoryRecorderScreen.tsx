import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { supabase, useAddLifeStoryEntry, useLifeStoryEntries } from '@sukyoo/core';
import { BigButton } from '../../components/BigButton';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, spacing } from '../../theme/tokens';

export function LifeStoryRecorderScreen() {
  const userId = useCurrentUserId();
  const { data: entries } = useLifeStoryEntries(userId);
  const addEntry = useAddLifeStoryEntry();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync().then((status) => {
      if (!status.granted) Alert.alert('Microphone needed', 'Allow microphone access to record your story.');
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
      Alert.alert('Could not save recording', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Record your life story" subtitle="Leave a legacy for your family" />

      <TextInput style={styles.input} placeholder="Give this story a title" value={title} onChangeText={setTitle} />

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
        <ListRow key={e.id} icon="🎙️" title={e.title} subtitle={new Date(e.created_at).toLocaleDateString()} />
      ))}
      {!entries?.length ? <Text style={styles.empty}>No stories recorded yet.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.md, backgroundColor: colors.surface },
  recordingRow: { gap: spacing.sm },
  recordingText: { color: colors.statusHigh, fontWeight: '700', textAlign: 'center' },
  empty: { color: colors.inkMuted },
});
