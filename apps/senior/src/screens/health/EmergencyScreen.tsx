import { useCallback, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedProps, useSharedValue, withTiming, cancelAnimation, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Location from 'expo-location';
import { useActiveSOSEvent, useEmergencyContacts, useTriggerSOS } from '@sukyoo/core';
import { Icon } from '../../components/Icon';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { Sentry } from '../../observability/sentry';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../../theme/tokens';
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
          <Icon name="emergency" size={30 * scale} color="#fff" />
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
  const primaryContact = (contacts ?? []).find((c) => c.is_primary && c.phone) ?? (contacts ?? []).find((c) => c.phone);

  const handleConfirm = useCallback(async () => {
    setLocalError(null);
    try {
      const location = await Location.getLastKnownPositionAsync().catch(() => null);
      const result = await triggerSOS.mutateAsync({
        latitude: location?.coords.latitude,
        longitude: location?.coords.longitude,
      });

      // The event was recorded, but reaching zero people is not success. This
      // happens when nobody is linked, no family device has registered a push
      // token, or FCM is down — none of which raise an error. Treat it exactly
      // like a failure and put the phone in front of them.
      if (!result || result.delivered === 0) {
        Sentry.captureMessage('SOS reached nobody', {
          level: 'error',
          tags: { flow: 'sos-trigger' },
          extra: { recipients: result?.recipients ?? 0 },
        });
        setLocalError(
          result?.recipients
            ? "We couldn't reach your family's phones. Call for help now:"
            : 'Nobody is linked to receive your alert yet. Call for help now:'
        );
      }
    } catch (e) {
      // A delayed SOS is worse than a visible failure — surface a direct
      // fallback immediately rather than silently retrying in the background.
      Sentry.captureException(e, { tags: { flow: 'sos-trigger' } });
      setLocalError("Couldn't reach Sukyoo care. Call for help now:");
    }
  }, [triggerSOS]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Emergency & assistance" />

      <View style={styles.sosCard}>
        <HoldToConfirmSOS onConfirm={handleConfirm} busy={triggerSOS.isPending} />
        <Text style={[styles.hint, { fontSize: fontSize.body * scale }]}>Press and hold for 3 seconds to alert your family and Sukyoo care team</Text>
        {activeSos ? (
          <Text style={[styles.statusText, { fontSize: fontSize.label * scale }]}>
            SOS active — status: {activeSos.status}
          </Text>
        ) : null}
        {localError ? (
          <View style={styles.fallbackBox}>
            <Text style={[styles.fallbackText, { fontSize: fontSize.body * scale }]}>{localError}</Text>
            {primaryContact?.phone ? (
              <Text
                style={[styles.fallbackButton, { fontSize: fontSize.body * scale }]}
                onPress={() => Linking.openURL(`tel:${primaryContact.phone}`)}
              >
                Call {primaryContact.display_name ?? 'your contact'}
              </Text>
            ) : null}
            <Text
              style={[styles.fallbackButton, { fontSize: fontSize.body * scale }]}
              onPress={() => Linking.openURL('tel:112')}
            >
              Call emergency services (112)
            </Text>
          </View>
        ) : null}
      </View>

      {/* No ambulance dispatch partner is integrated, so this cannot quote an
          arrival time — saying "~12 minutes" to someone in an emergency would
          be a promise we have no way to keep. */}
      <ListRow
        icon="phone"
        title="Book an ambulance"
        subtitle="Coming soon — call 112 for an ambulance now"
        onPress={() => Linking.openURL('tel:112')}
      />

      <SectionHeader title="Emergency contacts" />
      {(contacts ?? []).map((c) => (
        <ListRow
          key={c.id}
          icon={c.contact_type === 'physician' ? 'stethoscope' : 'profile'}
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
  fallbackBox: {
    backgroundColor: colors.redTint,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.red,
    padding: spacing.md,
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  fallbackText: { color: colors.red, fontWeight: '700', textAlign: 'center' },
  fallbackButton: {
    backgroundColor: colors.red,
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    overflow: 'hidden',
    minHeight: minTouchTarget,
    lineHeight: minTouchTarget,
  },
});
