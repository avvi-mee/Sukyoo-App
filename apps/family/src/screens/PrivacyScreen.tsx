import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import {
  useMyDataRequests,
  useNotificationPreferences,
  useRequestDataAction,
  useSetNotificationPreferences,
  useWithdrawDataRequest,
  type DataRequestType,
} from '@sukyoo/core';
import { useCurrentUserId } from '../hooks/useCurrentUserId';
import { notify } from '../notify';
import { colors, radii, spacing } from '../theme/tokens';

const TYPE_LABEL: Record<string, string> = {
  export: 'Copy of your information',
  erasure: 'Delete your account',
  correction: 'Correct your information',
};

const STATUS_LABEL: Record<string, string> = {
  received: 'Received',
  verifying: 'Verifying it is really you',
  approved: 'Approved, in progress',
  completed: 'Done',
  rejected: 'Not carried out',
  withdrawn: 'You cancelled this',
};

export function PrivacyScreen() {
  const userId = useCurrentUserId();
  const { data: prefs } = useNotificationPreferences(userId);
  const setPrefs = useSetNotificationPreferences(userId);
  const { data: requests } = useMyDataRequests(userId);
  const request = useRequestDataAction();
  const withdraw = useWithdrawDataRequest();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const open = (requests ?? []).filter((r) =>
    ['received', 'verifying', 'approved'].includes(r.status)
  );

  const raise = (type: DataRequestType, successMessage: string) => {
    setConfirmingDelete(false);
    request.mutate(
      { requestType: type },
      {
        onSuccess: () => notify('Request received', successMessage),
        onError: () => notify('Could not send that', 'Please check your connection and try again.'),
      }
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Notifications</Text>
      <View style={styles.card}>
        {/* No switch for emergency alerts, deliberately. Receiving them is the
            entire reason this app exists, and a toggle would invite somebody to
            turn off the thing they installed it for. */}
        <Text style={styles.note}>
          Emergency alerts and incoming calls always come through. There is no setting for those.
        </Text>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Activity updates</Text>
            <Text style={styles.note}>Order updates, appointment reminders, shared reports.</Text>
          </View>
          <Switch
            value={prefs?.activity_push ?? true}
            onValueChange={(value) => setPrefs.mutate({ activity_push: value })}
            trackColor={{ true: colors.success, false: colors.border }}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Offers and news</Text>
            <Text style={styles.note}>Discounts and new features.</Text>
          </View>
          <Switch
            value={prefs?.marketing_push ?? true}
            onValueChange={(value) => setPrefs.mutate({ marketing_push: value })}
            trackColor={{ true: colors.success, false: colors.border }}
          />
        </View>
      </View>

      <Text style={[styles.heading, styles.spaced]}>Your information</Text>
      <View style={styles.card}>
        <Text style={styles.note}>
          You can ask for a copy of everything Sukyoo holds about you, including who has looked at it.
        </Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            raise(
              'export',
              'We will confirm it is really you first, then assemble everything we hold about you.'
            )
          }
        >
          <Text style={styles.secondaryButtonText}>Ask for a copy of my information</Text>
        </Pressable>
      </View>

      {open.length > 0 ? (
        <>
          <Text style={[styles.heading, styles.spaced]}>What you have asked for</Text>
          {open.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.switchLabel}>{TYPE_LABEL[r.request_type] ?? r.request_type}</Text>
              <Text style={styles.note}>
                {STATUS_LABEL[r.status] ?? r.status} · {new Date(r.created_at).toLocaleDateString('en-IN')}
              </Text>
              <Pressable
                onPress={() =>
                  withdraw.mutate(r.id, {
                    onSuccess: () => notify('Cancelled', 'We have stopped working on that request.'),
                    onError: () => notify('Could not cancel that', 'Please try again in a moment.'),
                  })
                }
              >
                <Text style={styles.link}>Cancel this request</Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : null}

      <Text style={[styles.heading, styles.spaced]}>Delete your account</Text>
      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.dangerTitle}>This cannot be undone</Text>
        <Text style={styles.body}>
          Your account and your links to the family members you care for are permanently deleted. You will stop
          receiving their emergency alerts.
        </Text>
        {/* Said plainly: deleting the carer's account does not delete the
            senior's. Conflating the two would be the worst possible surprise. */}
        <Text style={styles.body}>
          This does not delete your family member&rsquo;s account or their health records — those are theirs, and
          only they can ask for them to be removed.
        </Text>

        {confirmingDelete ? (
          <>
            <Text style={styles.dangerTitle}>Are you sure?</Text>
            <Pressable
              style={styles.dangerButton}
              onPress={() =>
                raise(
                  'erasure',
                  'Someone will confirm it is really you, then your account will be deleted. You can cancel before then on this screen.'
                )
              }
            >
              <Text style={styles.dangerButtonText}>Yes, delete my account</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmingDelete(false)}>
              <Text style={styles.link}>No, keep my account</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.secondaryButton} onPress={() => setConfirmingDelete(true)}>
            <Text style={styles.secondaryButtonText}>Delete my account</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  heading: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: spacing.sm },
  spaced: { marginTop: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dangerCard: { borderColor: colors.danger },
  note: { color: colors.inkMuted, fontSize: 13 },
  body: { color: colors.ink, fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  switchText: { flex: 1, gap: 2 },
  switchLabel: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  dangerButton: {
    backgroundColor: colors.danger,
    borderRadius: radii.button,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  dangerButtonText: { color: colors.surface, fontWeight: '700', fontSize: 15 },
  dangerTitle: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  link: { color: colors.inkMuted, fontWeight: '600', fontSize: 14, paddingVertical: spacing.xs },
});
