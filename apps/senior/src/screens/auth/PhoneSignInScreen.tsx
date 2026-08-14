import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { sendOtp, verifyOtp } from '@sukyoo/core';
import { BigButton } from '../../components/BigButton';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

export function PhoneSignInScreen() {
  const { scale } = useFontScale();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp() {
    setBusy(true);
    setError(null);
    const { error: err } = await sendOtp(phone, { role: 'senior' });
    setBusy(false);
    if (err) setError(err.message);
    else setOtpSent(true);
  }

  async function handleVerifyOtp() {
    setBusy(true);
    setError(null);
    const { error: err } = await verifyOtp(phone, otp);
    setBusy(false);
    if (err) setError(err.message);
  }

  return (
    <View style={styles.center}>
      <Text style={[styles.title, { fontSize: fontSize.headline * scale }]}>Sukyoo</Text>
      <Text style={[styles.subtitle, { fontSize: fontSize.body * scale }]}>Sign in with your phone number</Text>

      <TextInput
        style={[styles.input, { fontSize: fontSize.body * scale }]}
        placeholder="Phone number (e.g. +919876543210)"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        editable={!otpSent}
      />

      {otpSent && (
        <TextInput
          style={[styles.input, { fontSize: fontSize.body * scale }]}
          placeholder="Enter the code we texted you"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
        />
      )}

      {error && <Text style={[styles.error, { fontSize: fontSize.label * scale }]}>{error}</Text>}

      {busy ? (
        <ActivityIndicator size="large" color={colors.coral} />
      ) : (
        <BigButton
          label={otpSent ? 'Verify code' : 'Send code'}
          onPress={otpSent ? handleVerifyOtp : handleSendOtp}
          disabled={(!otpSent && !phone) || (otpSent && !otp)}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg },
  title: { fontWeight: '800', color: colors.ink, marginBottom: spacing.xs },
  subtitle: { color: colors.inkMuted, marginBottom: spacing.lg, textAlign: 'center' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  button: { minWidth: 180, marginTop: spacing.sm },
  error: { color: colors.statusHigh, marginBottom: spacing.sm, textAlign: 'center' },
});
