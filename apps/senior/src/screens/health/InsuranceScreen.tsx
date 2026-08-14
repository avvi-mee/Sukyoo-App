import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import {
  useCreateFamilyInvite,
  useFamilyLinks,
  useInsuranceClaims,
  useInsurancePolicies,
  usePermissionGrants,
  useSetPermissionGrant,
} from '@sukyoo/core';
import { BigButton } from '../../components/BigButton';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

function FamilyAccessRow({ familyLinkId, name }: { familyLinkId: string; name: string }) {
  const { scale } = useFontScale();
  const { data: grants } = usePermissionGrants(familyLinkId);
  const setGrant = useSetPermissionGrant();
  const canView = (grants ?? []).some((g) => g.resource_type === 'insurance_claim' || g.resource_type === 'insurance_policy');
  const canOrder = (grants ?? []).some((g) => g.resource_type === 'order');

  function handleToggleRecords(value: boolean) {
    setGrant.mutate({ familyLinkId, resourceType: 'insurance_claim', enabled: value });
    setGrant.mutate({ familyLinkId, resourceType: 'insurance_policy', enabled: value });
  }

  function handleToggleOrdering(value: boolean) {
    setGrant.mutate({ familyLinkId, resourceType: 'order', enabled: value });
  }

  return (
    <View style={styles.familyRow}>
      <View style={styles.familySwitchRow}>
        <Text style={[styles.familyName, { fontSize: fontSize.body * scale }]}>{name} — Can view records & claims</Text>
        <Switch value={canView} onValueChange={handleToggleRecords} trackColor={{ true: colors.coral }} />
      </View>
      <View style={styles.familySwitchRow}>
        <Text style={[styles.familyName, { fontSize: fontSize.body * scale }]}>{name} — Can order & gift for you</Text>
        <Switch value={canOrder} onValueChange={handleToggleOrdering} trackColor={{ true: colors.coral }} />
      </View>
    </View>
  );
}

export function InsuranceScreen() {
  const { scale } = useFontScale();
  const userId = useCurrentUserId();
  const { data: policies } = useInsurancePolicies(userId);
  const { data: claims } = useInsuranceClaims(userId);
  const { data: familyLinks } = useFamilyLinks(userId);
  const createInvite = useCreateFamilyInvite();

  const policy = policies?.[0];

  function handleInvite() {
    createInvite.mutate(undefined, {
      onSuccess: (invite) =>
        Alert.alert('Share this code', `Give this code to your family member to link their Sukyoo Family app:\n\n${invite.code}\n\nValid for 24 hours.`),
      onError: (e) => Alert.alert('Could not create invite', e instanceof Error ? e.message : 'Try again.'),
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Insurance & records" />

      {policy ? (
        <View style={styles.policyCard}>
          <Text style={[styles.policyTitle, { fontSize: fontSize.title * scale }]}>{policy.policy_number}</Text>
          {policy.cover_amount ? (
            <Text style={[styles.policyDetail, { fontSize: fontSize.body * scale }]}>Cover: ₹{policy.cover_amount.toLocaleString('en-IN')}</Text>
          ) : null}
          {policy.valid_till ? (
            <Text style={[styles.policyDetail, { fontSize: fontSize.body * scale }]}>Valid till {new Date(policy.valid_till).toLocaleDateString()}</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.empty}>No insurance policy on file yet.</Text>
      )}

      <SectionHeader title="Claims" />
      {(claims ?? []).map((c) => (
        <ListRow
          key={c.id}
          icon="📑"
          title={c.claim_type ?? 'Claim'}
          subtitle={`Filed ${new Date(c.filed_at).toLocaleDateString()} — ${c.status.replace(/_/g, ' ')}`}
        />
      ))}
      {!claims?.length ? <Text style={styles.empty}>No claims filed.</Text> : null}

      <SectionHeader title="Family access" subtitle="Choose who can view your records & claims" />
      {(familyLinks ?? []).map((link) => (
        <FamilyAccessRow key={link.id} familyLinkId={link.id} name={link.family_member?.full_name ?? 'Family member'} />
      ))}
      {!familyLinks?.length ? <Text style={styles.empty}>No linked family members yet.</Text> : null}
      <BigButton label="Invite a family member" onPress={handleInvite} variant="secondary" loading={createInvite.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl * 2 },
  policyCard: { backgroundColor: colors.ink, borderRadius: radii.card, padding: spacing.md, gap: 4, marginBottom: spacing.sm },
  policyTitle: { color: '#fff', fontWeight: '800' },
  policyDetail: { color: '#E7DFD3' },
  empty: { color: colors.inkMuted, marginBottom: spacing.sm },
  familyRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  familySwitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  familyName: { flex: 1, color: colors.ink, fontWeight: '600' },
});
