import { Linking, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useReleaseGate } from '@sukyoo/core';
import { BigButton } from './BigButton';
import { colors, fontSize, radii, spacing } from '../theme/tokens';
import { useFontScale } from '../theme/FontScaleContext';

/**
 * Blocks the app when ops has locked this release, and shows the banner otherwise.
 *
 * Sits ABOVE the session check so it works before sign-in — the case it matters
 * most is when the thing that is broken is sign-in itself.
 *
 * It fails OPEN. If the config query errors, useReleaseGate returns 'ok' and this
 * renders children. The worst case of failing open is a broken release surviving
 * one more launch; the worst case of failing closed is a senior who cannot reach
 * the emergency button because a config table was briefly unreachable.
 */
export function ReleaseGate({ children }: { children: React.ReactNode }) {
  const { scale } = useFontScale();
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const { data: gate, isLoading } = useReleaseGate('senior', version);

  // Nothing is rendered blocking during the check — the app appears immediately
  // and the gate applies once it resolves. A splash screen waiting on a network
  // request is a splash screen that hangs on a bad connection.
  if (isLoading || !gate || gate.kind === 'ok') {
    return (
      <View style={styles.fill}>
        {gate?.kind === 'ok' && gate.banner ? (
          <View
            style={[
              styles.banner,
              gate.banner.severity === 'critical'
                ? styles.bannerCritical
                : gate.banner.severity === 'warning'
                  ? styles.bannerWarning
                  : styles.bannerInfo,
            ]}
          >
            <Text style={[styles.bannerText, { fontSize: fontSize.label * scale }]}>
              {gate.banner.message}
            </Text>
          </View>
        ) : null}
        {children}
      </View>
    );
  }

  if (gate.kind === 'maintenance') {
    return (
      <View style={styles.block}>
        <Text style={[styles.blockTitle, { fontSize: fontSize.title * scale }]}>
          Back very soon
        </Text>
        <Text style={[styles.blockBody, { fontSize: fontSize.body * scale }]}>{gate.message}</Text>
        {/* Said explicitly, because a senior who relies on this button needs to
            know it is not available right now rather than discovering it in an
            emergency. */}
        <Text style={[styles.blockWarning, { fontSize: fontSize.body * scale }]}>
          Your emergency button is not working while this message is showing. If you need help now, call 108.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Text style={[styles.blockTitle, { fontSize: fontSize.title * scale }]}>
        Please update Sukyoo
      </Text>
      <Text style={[styles.blockBody, { fontSize: fontSize.body * scale }]}>
        This version is too old to work safely. Updating takes a minute and keeps your emergency button working.
      </Text>
      {gate.storeUrl ? (
        <BigButton label="Update now" onPress={() => Linking.openURL(gate.storeUrl!)} style={styles.action} />
      ) : (
        <Text style={[styles.blockBody, { fontSize: fontSize.body * scale }]}>
          Please open the Play Store or App Store and update Sukyoo.
        </Text>
      )}
      <Text style={[styles.blockWarning, { fontSize: fontSize.body * scale }]}>
        Until you update, your emergency button will not work. If you need help now, call 108.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  block: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: 'center',
  },
  blockTitle: { color: colors.ink, fontWeight: '700' },
  blockBody: { color: colors.ink },
  blockWarning: { color: colors.red, fontWeight: '700' },
  action: { marginTop: spacing.sm },
  banner: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 0 },
  bannerInfo: { backgroundColor: colors.coralTint },
  bannerWarning: { backgroundColor: colors.amberTint },
  bannerCritical: { backgroundColor: colors.redTint },
  bannerText: { color: colors.ink, fontWeight: '600' },
});
