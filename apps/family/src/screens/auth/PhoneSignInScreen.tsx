import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { sendOtp, verifyOtp } from '@sukyoo/core';
import { colors, radii, spacing } from '../../theme/tokens';

export function PhoneSignInScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp() {
    setBusy(true);
    setError(null);
    const { error: err } = await sendOtp(phone, { role: 'family' });
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
      <Text style={styles.title}>Sukyoo Family</Text>
      <Text style={styles.subtitle}>Sign in with your phone number</Text>

      <TextInput style={styles.input} placeholder="Phone number (e.g. +919876543210)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} editable={!otpSent} />
      {otpSent && (
        <TextInput style={styles.input} placeholder="Enter the code we texted you" keyboardType="number-pad" value={otp} onChangeText={setOtp} />
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      {busy ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <Text
          onPress={otpSent ? handleVerifyOtp : handleSendOtp}
          style={[styles.button, ((!otpSent && !phone) || (otpSent && !otp)) && styles.buttonDisabled]}
        >
          {otpSent ? 'Verify code' : 'Send code'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: spacing.xs },
  subtitle: { color: colors.inkMuted, marginBottom: spacing.lg, textAlign: 'center' },
  input: { width: '100%', borderWidth: 1, borderColor: colors.border, borderRadius: radii.button, padding: spacing.md, backgroundColor: colors.surface, marginBottom: spacing.sm },
  button: { backgroundColor: colors.primary, color: '#fff', fontWeight: '700', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.button, overflow: 'hidden', marginTop: spacing.sm },
  buttonDisabled: { opacity: 0.5 },
  error: { color: colors.danger, marginBottom: spacing.sm, textAlign: 'center' },
});
