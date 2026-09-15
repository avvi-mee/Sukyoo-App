import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFamilyLinks, useInsuranceClaims, useInsurancePolicies } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { StatusPill } from '../../components/StatusPill';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import type { RootStackParamList } from '../../navigation/types';
import { useProtectedScreen } from '../../hooks/useProtectedScreen';

// 'filed' and 'in_review' are still moving; anything else has landed.
function claimTone(status: string) {
  if (status === 'rejected') return 'high' as const;
  if (status === 'approved' || status === 'settled') return 'normal' as const;
  return 'low' as const;
}

export function InsuranceScreen() {
  // Health and life-story data: block screenshots, screen recording and the
  // app-switcher snapshot while this screen is focused.
  useProtectedScreen('InsuranceScreen');

  const { scale } = useFontScale();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userId = useCurrentUserId();
  const { data: policies } = useInsurancePolicies(userId);
  const { data: claims } = useInsuranceClaims(userId);
  const { data: familyLinks } = useFamilyLinks(userId);

  const policy = policies?.[0];
  const linkedCount = familyLinks?.length ?? 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Insurance" subtitle="Coverage & claims" />

      {policy ? (
        <View style={styles.policyCard}>
          <Text style={[styles.policyLabel, { fontSize: fontSize.label * scale }]}>Policy</Text>
          {policy.cover_amount ? (
            <Text style={[styles.policyCover, { fontSize: fontSize.headline * 0.9 * scale }]}>
              ₹{policy.cover_amount.toLocaleString('en-IN')} cover
            </Text>
          ) : null}
          <View style={styles.policyMetaRow}>
            <View style={styles.policyMeta}>
              <Text style={[styles.policyLabel, { fontSize: fontSize.label * scale }]}>Policy no.</Text>
              <Text style={[styles.policyValue, { fontSize: fontSize.body * scale }]}>{policy.policy_number}</Text>
            </View>
            {policy.valid_till ? (
              <View style={styles.policyMeta}>
                <Text style={[styles.policyLabel, { fontSize: fontSize.label * scale }]}>Valid till</Text>
                <Text style={[styles.policyValue, { fontSize: fontSize.body * scale }]}>
                  {new Date(policy.valid_till).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : (
        <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>No insurance policy on file yet.</Text>
      )}

      <SectionHeader title="Claims" />
      {(claims ?? []).map((c) => (
        <ListRow
          key={c.id}
          icon="claim"
          title={c.claim_type ?? 'Claim'}
          subtitle={`Filed ${new Date(c.filed_at).toLocaleDateString('en-IN')}`}
          trailing={<StatusPill label={c.status.replace(/_/g, ' ')} tone={claimTone(c.status)} />}
        />
      ))}
      {!claims?.length ? <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>No claims filed.</Text> : null}

      {/* Sharing controls used to live inline here, but they cover seven
          resource types across the whole app — not just insurance — so they
          have their own screen now. */}
      <SectionHeader title="Family access" />
      <ListRow
        icon="family"
        title="Family & sharing"
        subtitle={
          linkedCount
            ? `${linkedCount} ${linkedCount === 1 ? 'person is' : 'people are'} linked — choose what they can see`
            : 'Invite a family member and choose what they can see'
        }
        onPress={() => navigation.navigate('FamilySharing')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  policyCard: { backgroundColor: colors.ink, borderRadius: radii.card, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.md },
  policyCover: { color: '#fff', fontWeight: '800' },
  policyMetaRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xs },
  policyMeta: { gap: 2 },
  policyLabel: { color: '#B9AFA2' },
  policyValue: { color: '#fff', fontWeight: '600' },
  empty: { color: colors.inkMuted, marginBottom: spacing.sm },
});
