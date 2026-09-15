import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAcceptFamilyInvite } from '@sukyoo/core';
import { ScreenHeader } from '../components/ScreenHeader';
import { notify } from '../notify';
import { colors, radii, spacing } from '../theme/tokens';

export function LinkSeniorScreen() {
  const [code, setCode] = useState('');
  const acceptInvite = useAcceptFamilyInvite();

  function handleSubmit() {
    acceptInvite.mutate(code.trim(), {
      onError: (e) => notify('Could not link', e instanceof Error ? e.message : 'Check the code and try again.'),
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Link a family member" />
      {/* The senior generates this from Settings → Family & sharing. Keep the
          path in sync with the senior app if that screen ever moves. */}
      <Text style={styles.subtitle}>
        Ask them to open Sukyoo → Settings → Family &amp; sharing → Invite a family member, and read out the 6-digit code.
        It stops working after 15 minutes.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="6-digit code"
        placeholderTextColor={colors.inkMuted}
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      <Text
        onPress={handleSubmit}
        style={[styles.button, (code.length !== 6 || acceptInvite.isPending) && styles.buttonDisabled]}
      >
        {acceptInvite.isPending ? 'Linking...' : 'Link account'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  subtitle: { color: colors.inkMuted, marginBottom: spacing.lg },
  // color is required, not cosmetic: without it a TextInput falls back to a
  // native default that Android's system-wide "force dark" feature can invert
  // to near-white on top of this white surface — the code becomes invisible as
  // it's typed even though it's really there. This field matters most: it's
  // the entire pairing flow.
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    padding: spacing.md,
    backgroundColor: colors.surface,
    color: colors.ink,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 4,
  },
  button: { backgroundColor: colors.primary, color: '#fff', fontWeight: '700', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.button, overflow: 'hidden', marginTop: spacing.sm },
  buttonDisabled: { opacity: 0.5 },
});
