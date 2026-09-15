import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { signInWithEmail, signUpWithEmail } from '@sukyoo/core';
import { BigButton } from '../../components/BigButton';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

export function EmailSignInScreen() {
  const { scale } = useFontScale();
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
      mode === 'signUp' ? await signUpWithEmail(email, password, { role: 'senior', full_name: fullName }) : await signInWithEmail(email, password);
    setBusy(false);
    if (err) setError(err.message);
  }

  return (
    <View style={styles.center}>
      <Text style={[styles.title, { fontSize: fontSize.headline * scale }]}>Sukyoo</Text>
      <Text style={[styles.subtitle, { fontSize: fontSize.body * scale }]}>
        {mode === 'signUp' ? 'Create your account' : 'Sign in'}
      </Text>

      {mode === 'signUp' && (
        <TextInput
          style={[styles.input, { fontSize: fontSize.body * scale }]}
          placeholder="Your name"
          placeholderTextColor={colors.inkMuted}
          value={fullName}
          onChangeText={setFullName}
        />
      )}
      <TextInput
        style={[styles.input, { fontSize: fontSize.body * scale }]}
        placeholder="Email address"
        placeholderTextColor={colors.inkMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { fontSize: fontSize.body * scale }]}
        placeholder="Password"
        placeholderTextColor={colors.inkMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={[styles.error, { fontSize: fontSize.label * scale }]}>{error}</Text>}

      {busy ? (
        <ActivityIndicator size="large" color={colors.coral} />
      ) : (
        <BigButton
          label={mode === 'signUp' ? 'Create account' : 'Sign in'}
          onPress={handleSubmit}
          disabled={!email || !password || (mode === 'signUp' && !fullName)}
          style={styles.button}
        />
      )}

      <Text
        style={[styles.switchMode, { fontSize: fontSize.label * scale }]}
        onPress={() => {
          setMode(mode === 'signUp' ? 'signIn' : 'signUp');
          setError(null);
        }}
      >
        {mode === 'signUp' ? 'Already have an account? Sign in' : "New here? Create an account"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg },
  title: { fontWeight: '800', color: colors.ink, marginBottom: spacing.xs },
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
  button: { minWidth: 180, marginTop: spacing.sm },
  error: { color: colors.statusHigh, marginBottom: spacing.sm, textAlign: 'center' },
  switchMode: { color: colors.coral, marginTop: spacing.lg, fontWeight: '600' },
});
