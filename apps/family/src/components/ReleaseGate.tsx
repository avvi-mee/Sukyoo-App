import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useReleaseGate } from '@sukyoo/core';
import { colors, radii, spacing } from '../theme/tokens';

/**
 * Blocks the app when ops has locked this release, and shows the banner otherwise.
 *
 * Sits above the auth gate so it applies before sign-in. It fails OPEN — if the
 * config query errors, useReleaseGate returns 'ok' and this renders children.
 * Locking a family member out of SOS alerts because a config table blipped would
 * be a worse outcome than one extra launch of a stale build.
 */
export function ReleaseGate({ children }: { children: React.ReactNode }) {
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const { data: gate, isLoading } = useReleaseGate('family', version);

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
            <Text style={styles.bannerText}>{gate.banner.message}</Text>
          </View>
        ) : null}
        {children}
      </View>
    );
  }

  if (gate.kind === 'maintenance') {
    return (
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Back very soon</Text>
        <Text style={styles.blockBody}>{gate.message}</Text>
        {/* The family app's whole purpose is receiving emergency alerts, so the
            consequence has to be stated rather than left to be discovered. */}
        <Text style={styles.blockWarning}>
          You will not receive emergency alerts while this message is showing. Please keep your phone to hand and
          call your family member directly if you are worried.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>Update required</Text>
      <Text style={styles.blockBody}>
        This version is too old to receive emergency alerts reliably. Please update before continuing.
      </Text>
      {gate.storeUrl ? (
        <Pressable style={styles.action} onPress={() => Linking.openURL(gate.storeUrl!)}>
          <Text style={styles.actionText}>Update now</Text>
        </Pressable>
      ) : (
        <Text style={styles.blockBody}>Open the Play Store or App Store and update Sukyoo Family.</Text>
      )}
      <Text style={styles.blockWarning}>
        Until you update, emergency alerts may not reach you.
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
  blockTitle: { color: colors.ink, fontWeight: '700', fontSize: 22 },
  blockBody: { color: colors.ink, fontSize: 15 },
  blockWarning: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  action: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  actionText: { color: colors.surface, fontWeight: '700', fontSize: 16 },
  banner: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bannerInfo: { backgroundColor: colors.primaryTint },
  bannerWarning: { backgroundColor: '#FDF6E3' },
  bannerCritical: { backgroundColor: colors.dangerTint },
  bannerText: { color: colors.ink, fontWeight: '600', fontSize: 14 },
});
