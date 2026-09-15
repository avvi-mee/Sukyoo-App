import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useAckSosEvent, useProfile } from '@sukyoo/core';
import { Icon } from '../components/Icon';
import { colors, radii, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export function SOSAlertScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'SOSAlert'>>();
  const { data: senior } = useProfile(params.seniorId);
  const ack = useAckSosEvent();

  // The RPC derives the recipient from the caller's JWT and moves the event
  // itself off 'triggered' — updating sos_notifications alone (as this did
  // before) left the senior's screen showing an unanswered alert forever.
  function handleAck() {
    ack.mutate(params.sosEventId);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.siren}>
        <Icon name="emergency" size={56} color="#fff" strokeWidth={2.5} />
      </View>
      <Text style={styles.title}>Emergency alert</Text>
      <Text style={styles.subtitle}>{senior?.full_name ?? 'Your family member'} needs help now</Text>

      {senior?.phone ? (
        <Pressable style={styles.callButton} onPress={() => Linking.openURL(`tel:${senior.phone}`)}>
          <Icon name="phone" size={20} color={colors.danger} />
          <Text style={styles.callButtonLabel}>Call {senior.full_name}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.ackButton} onPress={handleAck}>
        {ack.isSuccess ? "Acknowledged — I'm on it" : "I've seen this"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  // Ringed disc rather than a bare glyph, so the alert reads as deliberate at
  // a glance from across a room.
  siren: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 16, color: '#fff', textAlign: 'center', marginBottom: spacing.lg },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#fff',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.button,
    marginBottom: spacing.sm,
  },
  callButtonLabel: { color: colors.danger, fontWeight: '800', fontSize: 18 },
  ackButton: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    textDecorationLine: 'underline',
    marginTop: spacing.md,
  },
});
