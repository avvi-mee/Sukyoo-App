import { useCallback, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedProps, useSharedValue, withTiming, cancelAnimation, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Location from 'expo-location';
import { useActiveSOSEvent, useEmergencyContacts, useTriggerSOS } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { Sentry } from '../../observability/sentry';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

const HOLD_MS = 3000;
const RING_SIZE = 160;
const RING_RADIUS = 70;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function HoldToConfirmSOS({ onConfirm, busy }: { onConfirm: () => void; busy: boolean }) {
  const { scale } = useFontScale();
  const progress = useSharedValue(0);
  const confirmedRef = useRef(false);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
  }));

  const gesture = Gesture.LongPress()
    .minDuration(HOLD_MS)
    .onBegin(() => {
      confirmedRef.current = false;
      progress.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear });
    })
    .onStart(() => {
      confirmedRef.current = true;
      onConfirm();
    })
    .onFinalize(() => {
      if (!confirmedRef.current) {
        cancelAnimation(progress);
        progress.value = withTiming(0, { duration: 200 });
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={colors.redTint} strokeWidth={10} fill={colors.red} />
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke="#fff"
            strokeWidth={6}
            fill="none"
            strokeDasharray={RING_CIRCUMFERENCE}
            animatedProps={animatedProps}
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.ringLabel} pointerEvents="none">
          <Text style={[styles.sosText, { fontSize: fontSize.title * scale }]}>{busy ? '...' : 'SOS'}</Text>
        </View>
      </View>
    </GestureDetector>
  );
}

export function EmergencyScreen() {
  const { scale } = useFontScale();
  const userId = useCurrentUserId();
  const { data: contacts } = useEmergencyContacts(userId);
  const { data: activeSos } = useActiveSOSEvent(userId);
  const triggerSOS = useTriggerSOS();

  const [localError, setLocalError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setLocalError(null);
    try {
      const location = await Location.getLastKnownPositionAsync().catch(() => null);
      await triggerSOS.mutateAsync({
        latitude: location?.coords.latitude,
        longitude: location?.coords.longitude,
      });
    } catch (e) {
      // A delayed SOS is worse than a visible failure — surface a direct
      // fallback immediately rather than silently retrying in the background.
      Sentry.captureException(e, { tags: { flow: 'sos-trigger' } });
      setLocalError("Couldn't reach Sukyoo care. Call for help now:");
    }
  }, [triggerSOS]);

  return (
    <View style={styles.screen}>
      <SectionHeader title="Emergency & assistance" />

      <View style={styles.sosCard}>
        <HoldToConfirmSOS onConfirm={handleConfirm} busy={triggerSOS.isPending} />
        <Text style={[styles.hint, { fontSize: fontSize.body * scale }]}>Press and hold for 3 seconds to alert your family and Sukyoo care team</Text>
        {activeSos ? (
          <Text style={[styles.statusText, { fontSize: fontSize.label * scale }]}>
            SOS active — status: {activeSos.status}
          </Text>
        ) : null}
        {localError ? (
          <Text
            style={[styles.errorLink, { fontSize: fontSize.body * scale }]}
            onPress={() => Linking.openURL('tel:112')}
          >
            {localError} tap to call 112
          </Text>
        ) : null}
      </View>

      <ListRow
        icon="🚑"
        title="Book an ambulance"
        subtitle="Arrives in ~12 minutes"
        onPress={() => Alert.alert('Ambulance', 'Ambulance dispatch partner integration is coming soon.')}
      />

      <SectionHeader title="Emergency contacts" />
      {(contacts ?? []).map((c) => (
        <ListRow
          key={c.id}
          icon={c.contact_type === 'physician' ? '🩺' : '👨‍👩‍👧'}
          title={c.display_name ?? 'Contact'}
          subtitle={c.is_primary ? 'Primary contact' : c.contact_type === 'physician' ? 'Family physician' : undefined}
          actionLabel="Call"
          onPressAction={() => c.phone && Linking.openURL(`tel:${c.phone}`)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.md, gap: spacing.sm },
  sosCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  sosText: { color: '#fff', fontWeight: '800' },
  hint: { color: colors.inkMuted, textAlign: 'center', maxWidth: 280 },
  statusText: { color: colors.statusHigh, fontWeight: '700' },
  errorLink: { color: colors.statusHigh, fontWeight: '700', textAlign: 'center', textDecorationLine: 'underline' },
});
