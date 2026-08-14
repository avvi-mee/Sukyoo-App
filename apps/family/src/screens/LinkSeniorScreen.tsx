import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAcceptFamilyInvite } from '@sukyoo/core';
import { colors, radii, spacing } from '../theme/tokens';

export function LinkSeniorScreen() {
  const [code, setCode] = useState('');
  const acceptInvite = useAcceptFamilyInvite();

  function handleSubmit() {
    acceptInvite.mutate(code.trim(), {
      onError: (e) => Alert.alert('Could not link', e instanceof Error ? e.message : 'Check the code and try again.'),
    });
  }

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Link to a family member</Text>
      <Text style={styles.subtitle}>Ask them to open Sukyoo → HealthHub → Insurance & records → Family access, and share the 6-digit code shown there.</Text>
      <TextInput
        style={styles.input}
        placeholder="6-digit code"
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
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: spacing.xs, textAlign: 'center' },
  subtitle: { color: colors.inkMuted, marginBottom: spacing.lg, textAlign: 'center' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 4,
  },
  button: { backgroundColor: colors.primary, color: '#fff', fontWeight: '700', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.button, overflow: 'hidden', marginTop: spacing.sm },
  buttonDisabled: { opacity: 0.5 },
});
