import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import {
  useCreateFamilyInvite,
  useFamilyLinks,
  usePermissionGrants,
  useSetFamilyLinkStatus,
  useSetPermissionGrant,
  type PermissionResourceType,
} from '@sukyoo/core';
import { BigButton } from '../../components/BigButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import { useProtectedScreen } from '../../hooks/useProtectedScreen';

// Every resource type a senior can share, in plain language. The wording is
// deliberately first-person and concrete — "Priya can see my medicines", not
// "medication: view" — because this is the consent surface and the person
// reading it has to understand exactly what they are agreeing to.
const SHAREABLE: { type: PermissionResourceType; label: (name: string) => string; detail: string }[] = [
  { type: 'vitals', label: (n) => `${n} can see my readings`, detail: 'Blood pressure, sugar, oxygen' },
  { type: 'medication', label: (n) => `${n} can see my medicines`, detail: 'What I take and whether I took it' },
  { type: 'health_record', label: (n) => `${n} can see my reports`, detail: 'Test results and prescriptions' },
  { type: 'insurance_policy', label: (n) => `${n} can see my policy`, detail: 'Cover amount and validity' },
  { type: 'insurance_claim', label: (n) => `${n} can see my claims`, detail: 'Claims filed and their status' },
  { type: 'life_story_entry', label: (n) => `${n} can hear my stories`, detail: 'Recordings I have saved' },
  { type: 'order', label: (n) => `${n} can order and pay for me`, detail: 'Lets them place orders on my account' },
];

function FamilyMemberCard({ familyLinkId, name }: { familyLinkId: string; name: string }) {
  const { scale } = useFontScale();
  const { data: grants } = usePermissionGrants(familyLinkId);
  const setGrant = useSetPermissionGrant();
  const setLinkStatus = useSetFamilyLinkStatus();
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);

  const isGranted = (type: PermissionResourceType) => (grants ?? []).some((g) => g.resource_type === type);

  function handleUnlink() {
    if (!confirmingUnlink) {
      setConfirmingUnlink(true);
      return;
    }
    setLinkStatus.mutate(
      { linkId: familyLinkId, status: 'revoked' },
      {
        onSuccess: () => notify('Removed', `${name} can no longer see anything of yours.`),
        onError: (e) => notify('Could not remove', e instanceof Error ? e.message : 'Try again.'),
      }
    );
  }

  return (
    <View style={styles.card}>
      <Text style={[styles.name, { fontSize: fontSize.title * 0.8 * scale }]}>{name}</Text>

      {SHAREABLE.map((item) => (
        <View key={item.type} style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.switchLabel, { fontSize: fontSize.body * scale }]}>{item.label(name)}</Text>
            <Text style={[styles.switchDetail, { fontSize: fontSize.label * scale }]}>{item.detail}</Text>
          </View>
          <Switch
            value={isGranted(item.type)}
            onValueChange={(enabled) =>
              setGrant.mutate({ familyLinkId, resourceType: item.type, enabled })
            }
            trackColor={{ true: colors.coral }}
            accessibilityLabel={item.label(name)}
          />
        </View>
      ))}

      <BigButton
        label={confirmingUnlink ? `Yes, remove ${name}` : `Remove ${name}`}
        variant="danger"
        loading={setLinkStatus.isPending}
        onPress={handleUnlink}
        style={styles.unlink}
      />
      {confirmingUnlink ? (
        <Text style={[styles.unlinkWarning, { fontSize: fontSize.label * scale }]}>
          This turns off everything above at once. You can invite them again later.
        </Text>
      ) : null}
    </View>
  );
}

export function FamilySharingScreen() {
  // Health and life-story data: block screenshots, screen recording and the
  // app-switcher snapshot while this screen is focused.
  useProtectedScreen('FamilySharingScreen');

  const { scale } = useFontScale();
  const userId = useCurrentUserId();
  const { data: familyLinks } = useFamilyLinks(userId);
  const createInvite = useCreateFamilyInvite();

  function handleInvite() {
    createInvite.mutate(undefined, {
      // The code exists only in this response — the table stores a hash — so
      // it has to go on screen now or not at all.
      onSuccess: (invite) =>
        notify(
          'Share this code',
          `Give this code to your family member to type into their Sukyoo Family app:\n\n${invite.code}\n\nIt stops working in 15 minutes.`
        ),
      onError: (e) => notify('Could not create invite', e instanceof Error ? e.message : 'Try again.'),
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Family & sharing" subtitle="You choose what each person can see. Nothing is shared until you turn it on." />

      {(familyLinks ?? []).map((link) => (
        <FamilyMemberCard
          key={link.id}
          familyLinkId={link.id}
          name={link.family_member?.full_name ?? 'Family member'}
        />
      ))}

      {!familyLinks?.length ? (
        <Text style={[styles.empty, { fontSize: fontSize.body * scale }]}>
          Nobody is linked yet. Invite a family member so they can check in on you.
        </Text>
      ) : null}

      <BigButton label="Invite a family member" onPress={handleInvite} variant="secondary" loading={createInvite.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  name: { color: colors.ink, fontWeight: '800' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: minTouchTarget,
  },
  switchText: { flex: 1, gap: 2 },
  switchLabel: { color: colors.ink, fontWeight: '600' },
  switchDetail: { color: colors.inkMuted },
  unlink: { marginTop: spacing.xs },
  unlinkWarning: { color: colors.red, textAlign: 'center' },
  empty: { color: colors.inkMuted, marginBottom: spacing.md },
});
