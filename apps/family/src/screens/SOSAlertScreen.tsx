import { Linking, StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useAckSosNotification, useProfile } from '@sukyoo/core';
import { useCurrentUserId } from '../hooks/useCurrentUserId';
import { colors, radii, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export function SOSAlertScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'SOSAlert'>>();
  const familyMemberId = useCurrentUserId();
  const { data: senior } = useProfile(params.seniorId);
  const ack = useAckSosNotification();

  function handleAck() {
    if (!familyMemberId) return;
    ack.mutate({ sosEventId: params.sosEventId, recipientId: familyMemberId });
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.siren}>🚨</Text>
      <Text style={styles.title}>Emergency alert</Text>
      <Text style={styles.subtitle}>{senior?.full_name ?? 'Your family member'} needs help now</Text>

      {senior?.phone ? (
        <Text style={styles.callButton} onPress={() => Linking.openURL(`tel:${senior.phone}`)}>
          📞 Call {senior.full_name}
        </Text>
      ) : null}

      <Text style={styles.ackButton} onPress={handleAck}>
        {ack.isSuccess ? "Acknowledged — I'm on it" : "I've seen this"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  siren: { fontSize: 64 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 16, color: '#fff', textAlign: 'center', marginBottom: spacing.lg },
  callButton: {
    backgroundColor: '#fff',
    color: colors.danger,
    fontWeight: '800',
    fontSize: 18,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.button,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  ackButton: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    textDecorationLine: 'underline',
    marginTop: spacing.md,
  },
});
