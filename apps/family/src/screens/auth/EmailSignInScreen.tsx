import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { signInWithEmail, signUpWithEmail } from '@sukyoo/core';
import { colors, radii, spacing } from '../../theme/tokens';

export function EmailSignInScreen() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    const { error: err } =
      mode === 'signUp' ? await signUpWithEmail(email, password, { role: 'family', full_name: fullName }) : await signInWithEmail(email, password);
    setBusy(false);
    if (err) setError(err.message);
  }

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Sukyoo Family</Text>
      <Text style={styles.subtitle}>{mode === 'signUp' ? 'Create your account' : 'Sign in'}</Text>

      {mode === 'signUp' && (
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.inkMuted}
          value={fullName}
          onChangeText={setFullName}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor={colors.inkMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.inkMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      {busy ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <Text
          onPress={handleSubmit}
          style={[styles.button, (!email || !password || (mode === 'signUp' && !fullName)) && styles.buttonDisabled]}
        >
          {mode === 'signUp' ? 'Create account' : 'Sign in'}
        </Text>
      )}

      <Text
        style={styles.switchMode}
        onPress={() => {
          setMode(mode === 'signUp' ? 'signIn' : 'signUp');
          setError(null);
        }}
      >
        {mode === 'signUp' ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: spacing.xs },
  subtitle: { color: colors.inkMuted, marginBottom: spacing.lg, textAlign: 'center' },
  // color is required, not cosmetic: without it, a TextInput falls back to a
  // native default that Android's system-wide "force dark" feature can invert
  // to near-white — indistinguishable from the white surface behind it, so
  // whatever the user types is invisible even though it's really being typed.
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    padding: spacing.md,
    backgroundColor: colors.surface,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  button: { backgroundColor: colors.primary, color: '#fff', fontWeight: '700', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.button, overflow: 'hidden', marginTop: spacing.sm },
  buttonDisabled: { opacity: 0.5 },
  error: { color: colors.danger, marginBottom: spacing.sm, textAlign: 'center' },
  switchMode: { color: colors.primary, marginTop: spacing.lg, fontWeight: '600' },
});
