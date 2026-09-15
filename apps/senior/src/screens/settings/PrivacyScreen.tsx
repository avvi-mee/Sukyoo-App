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
import { BigButton } from '../../components/BigButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

const TYPE_LABEL: Record<string, string> = {
  export: 'Copy of your information',
  erasure: 'Delete your account',
  correction: 'Correct your information',
};

const STATUS_LABEL: Record<string, string> = {
  received: 'Received — we will be in touch',
  verifying: 'We are checking it is really you',
  approved: 'Approved, being worked on',
  completed: 'Done',
  rejected: 'Not carried out',
  withdrawn: 'You cancelled this',
};

export function PrivacyScreen() {
  const { scale } = useFontScale();
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
  const exportReady = (requests ?? []).find(
    (r) => r.request_type === 'export' && r.export_payload !== null
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
      <ScreenHeader title="Privacy & your data" />

      <SectionHeader title="Notifications" />
      <View style={styles.card}>
        {/* Safety alerts are absent from this list on purpose. There is no
            switch for them because there is nothing to turn off — saying so
            plainly is better than a disabled toggle nobody understands. */}
        <Text style={[styles.cardNote, { fontSize: fontSize.label * scale }]}>
          Emergency alerts, incoming calls and medicine reminders always come through. You cannot turn those off, and
          we would not ask you to.
        </Text>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.switchLabel, { fontSize: fontSize.body * scale }]}>
              Reminders about your activity
            </Text>
            <Text style={[styles.cardNote, { fontSize: fontSize.label * scale }]}>
              Live programmes you signed up for, order updates, appointments.
            </Text>
          </View>
          <Switch
            value={prefs?.activity_push ?? true}
            onValueChange={(value) => setPrefs.mutate({ activity_push: value })}
            trackColor={{ true: colors.green, false: colors.border }}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.switchLabel, { fontSize: fontSize.body * scale }]}>Offers and news</Text>
            <Text style={[styles.cardNote, { fontSize: fontSize.label * scale }]}>
              Discounts and new features. Turn this off and we will stop.
            </Text>
          </View>
          <Switch
            value={prefs?.marketing_push ?? true}
            onValueChange={(value) => setPrefs.mutate({ marketing_push: value })}
            trackColor={{ true: colors.green, false: colors.border }}
          />
        </View>
      </View>

      <SectionHeader title="Your information" />
      <View style={styles.card}>
        <Text style={[styles.cardNote, { fontSize: fontSize.label * scale }]}>
          You can ask for a copy of everything we hold about you, including a list of who has looked at it.
        </Text>
        <BigButton
          label="Ask for a copy of my information"
          variant="secondary"
          onPress={() =>
            raise(
              'export',
              'We will put together everything we hold about you. Someone will confirm it is really you first, then it will appear on this screen.'
            )
          }
          style={styles.action}
        />
        {exportReady ? (
          <Text style={[styles.ready, { fontSize: fontSize.label * scale }]}>
            Your copy is ready. Call us on the number in Help and we will send it the way you prefer.
          </Text>
        ) : null}
      </View>

      {open.length > 0 ? (
        <>
          <SectionHeader title="What you have asked for" />
          {open.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={[styles.switchLabel, { fontSize: fontSize.body * scale }]}>
                {TYPE_LABEL[r.request_type] ?? r.request_type}
              </Text>
              <Text style={[styles.cardNote, { fontSize: fontSize.label * scale }]}>
                {STATUS_LABEL[r.status] ?? r.status} · asked on{' '}
                {new Date(r.created_at).toLocaleDateString('en-IN')}
              </Text>
              <Pressable
                style={styles.link}
                onPress={() =>
                  withdraw.mutate(r.id, {
                    onSuccess: () => notify('Cancelled', 'We have stopped working on that request.'),
                    onError: () => notify('Could not cancel that', 'Please try again in a moment.'),
                  })
                }
              >
                <Text style={[styles.linkText, { fontSize: fontSize.label * scale }]}>
                  Cancel this request
                </Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : null}

      <SectionHeader title="Delete your account" />
      <View style={[styles.card, styles.dangerCard]}>
        {/* Apple requires this path to exist in the app, and the DPDP Act
            requires it to be readily available. It is written in plain terms
            because "exercise your right to erasure" means nothing to the person
            who needs it. */}
        <Text style={[styles.dangerTitle, { fontSize: fontSize.body * scale }]}>
          This cannot be undone
        </Text>
        <Text style={[styles.dangerBody, { fontSize: fontSize.label * scale }]}>
          Your health readings, medicines, reports, recordings, emergency contacts and family links are permanently
          deleted. Records of what you paid for are kept, because the law requires it, but they will no longer have
          your name on them.
        </Text>
        <Text style={[styles.dangerBody, { fontSize: fontSize.label * scale }]}>
          Your emergency button will stop working once this is done.
        </Text>

        {confirmingDelete ? (
          <>
            <Text style={[styles.dangerTitle, { fontSize: fontSize.body * scale }]}>
              Are you sure?
            </Text>
            <BigButton
              label="Yes, delete my account"
              variant="danger"
              onPress={() =>
                raise(
                  'erasure',
                  'Someone will call you to check it is really you, and then your account will be deleted. You can cancel any time before that on this screen.'
                )
              }
              style={styles.action}
            />
            <Pressable style={styles.link} onPress={() => setConfirmingDelete(false)}>
              <Text style={[styles.linkText, { fontSize: fontSize.label * scale }]}>
                No, keep my account
              </Text>
            </Pressable>
          </>
        ) : (
          <BigButton
            label="Delete my account"
            variant="secondary"
            onPress={() => setConfirmingDelete(true)}
            style={styles.action}
          />
        )}
      </View>
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
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dangerCard: { borderColor: colors.red },
  cardNote: { color: colors.inkMuted },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  switchText: { flex: 1, gap: 2 },
  switchLabel: { color: colors.ink, fontWeight: '700' },
  action: { marginTop: spacing.xs },
  ready: { color: colors.green, fontWeight: '600' },
  dangerTitle: { color: colors.red, fontWeight: '700' },
  dangerBody: { color: colors.ink },
  link: { minHeight: minTouchTarget, justifyContent: 'center' },
  linkText: { color: colors.inkMuted, fontWeight: '600' },
});
