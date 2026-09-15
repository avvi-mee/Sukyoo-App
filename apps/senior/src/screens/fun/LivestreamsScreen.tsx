import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  useLivestreams,
  useMyLivestreamRegistrations,
  useReportContent,
  useToggleLivestreamRegistration,
  type ReportCategory,
} from '@sukyoo/core';
import { Icon, glyphColorFor } from '../../components/Icon';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatusPill } from '../../components/StatusPill';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

// Plain words, not moderation jargon. "Inappropriate" and "distressing" mean the
// same thing to an ops queue but very different things to someone reading them
// on a phone at arm's length.
const REPORT_OPTIONS: { key: ReportCategory; label: string }[] = [
  { key: 'not_working', label: "It won't play" },
  { key: 'distressing', label: 'It upset me' },
  { key: 'inappropriate', label: "It shouldn't be here" },
  { key: 'inaccurate', label: 'Something is wrong with it' },
];

function whenLabel(startsAt: string) {
  const start = new Date(startsAt);
  const time = start.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const tomorrow = new Date(today.getTime() + 86_400_000);

  if (isSameDay(start, today)) return `Today at ${time}`;
  if (isSameDay(start, tomorrow)) return `Tomorrow at ${time}`;
  return `${start.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} at ${time}`;
}

export function LivestreamsScreen() {
  const { scale } = useFontScale();
  const userId = useCurrentUserId();
  const { data: streams, isLoading } = useLivestreams();
  const { data: registered } = useMyLivestreamRegistrations(userId);
  const toggle = useToggleLivestreamRegistration(userId);
  const report = useReportContent();
  const [reportingId, setReportingId] = useState<string | null>(null);

  const registeredIds = new Set(registered ?? []);
  const live = (streams ?? []).filter((s) => s.state === 'live');
  const upcoming = (streams ?? []).filter((s) => s.state !== 'live');

  const onToggle = (livestreamId: string) => {
    const already = registeredIds.has(livestreamId);
    toggle.mutate(
      { livestreamId, registered: already },
      {
        onSuccess: () =>
          notify(
            already ? 'Reminder turned off' : "We'll remind you",
            already
              ? "You won't get reminders for this one."
              : "We'll let you know the day before, an hour before, and when it starts."
          ),
        onError: () => notify('Could not save that', 'Please check your connection and try again.'),
      }
    );
  };

  const onReport = (livestreamId: string, category: ReportCategory, label: string) => {
    setReportingId(null);
    report.mutate(
      { resourceType: 'livestream', resourceId: livestreamId, category, detail: label },
      {
        onSuccess: () =>
          notify(
            'Thank you for telling us',
            'Someone on our team will look at this. You can close this now.'
          ),
        onError: () => notify('Could not send that', 'Please check your connection and try again.'),
      }
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Live programmes" subtitle="Bhajans, talks & classes" />

      {isLoading ? (
        <Text style={[styles.muted, { fontSize: fontSize.body * scale }]}>Loading…</Text>
      ) : null}

      {!isLoading && (streams ?? []).length === 0 ? (
        <View style={styles.notice}>
          <Text style={[styles.noticeTitle, { fontSize: fontSize.body * scale }]}>
            Nothing scheduled just now
          </Text>
          <Text style={[styles.noticeBody, { fontSize: fontSize.label * scale }]}>
            When a live programme is planned it will appear here, and you can ask us to remind you before it starts.
          </Text>
        </View>
      ) : null}

      {[...live, ...upcoming].map((stream) => {
        const isLive = stream.state === 'live';
        const isRegistered = registeredIds.has(stream.id);

        return (
          <View key={stream.id} style={[styles.card, isLive && styles.cardLive]}>
            <View style={styles.cardHead}>
              <View style={[styles.iconWrap, { backgroundColor: isLive ? colors.redTint : colors.greenTint }]}>
                <Icon
                  name={isLive ? 'radio' : 'calendar'}
                  size={24 * scale}
                  color={glyphColorFor(isLive ? colors.redTint : colors.greenTint)}
                />
              </View>
              <View style={styles.cardHeadText}>
                <Text style={[styles.title, { fontSize: fontSize.body * scale }]}>{stream.title}</Text>
                <Text style={[styles.muted, { fontSize: fontSize.label * scale }]}>
                  {isLive ? 'On air now' : whenLabel(stream.starts_at)}
                  {stream.host_name ? ` · ${stream.host_name}` : ''}
                </Text>
              </View>
              {isLive ? <StatusPill label="LIVE" tone="high" /> : null}
            </View>

            {stream.description ? (
              <Text style={[styles.body, { fontSize: fontSize.label * scale }]}>{stream.description}</Text>
            ) : null}

            {stream.content_warning ? (
              <Text style={[styles.warning, { fontSize: fontSize.label * scale }]}>
                Please note: {stream.content_warning}
              </Text>
            ) : null}

            {isLive ? (
              <Pressable
                style={styles.primary}
                onPress={() =>
                  stream.playback_url
                    ? notify(
                        'Opening the programme',
                        'The player is being finished — this will start playing here shortly.'
                      )
                    : notify(
                        'Not quite ready',
                        "This programme hasn't started streaming yet. Please try again in a moment."
                      )
                }
              >
                <Text style={[styles.primaryText, { fontSize: fontSize.body * scale }]}>Watch now</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.secondary, isRegistered && styles.secondaryOn]}
                onPress={() => onToggle(stream.id)}
                disabled={toggle.isPending}
              >
                <Icon
                  name={isRegistered ? 'check' : 'add'}
                  size={20 * scale}
                  color={isRegistered ? colors.green : colors.surface}
                />
                <Text
                  style={[
                    styles.secondaryText,
                    isRegistered && styles.secondaryTextOn,
                    { fontSize: fontSize.body * scale },
                  ]}
                >
                  {isRegistered ? "We'll remind you" : 'Remind me'}
                </Text>
              </Pressable>
            )}

            {/* The report path exists on every card, live or not. A senior who
                sees something upsetting should not have to find a settings
                screen to say so. */}
            {reportingId === stream.id ? (
              <View style={styles.reportBox}>
                <Text style={[styles.reportPrompt, { fontSize: fontSize.label * scale }]}>
                  What would you like to tell us?
                </Text>
                {REPORT_OPTIONS.map((option) => (
                  <Pressable
                    key={option.key}
                    style={styles.reportOption}
                    onPress={() => onReport(stream.id, option.key, option.label)}
                  >
                    <Text style={[styles.reportOptionText, { fontSize: fontSize.body * scale }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
                <Pressable style={styles.reportOption} onPress={() => setReportingId(null)}>
                  <Text style={[styles.muted, { fontSize: fontSize.label * scale }]}>Never mind</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.reportLink} onPress={() => setReportingId(stream.id)}>
                <Icon name="flag" size={18 * scale} color={colors.inkMuted} />
                <Text style={[styles.reportLinkText, { fontSize: fontSize.label * scale }]}>
                  Tell us about this
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardLive: { borderColor: colors.red, borderWidth: 2 },
  notice: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.md,
    gap: 4,
  },
  noticeTitle: { color: colors.ink, fontWeight: '700' },
  noticeBody: { color: colors.inkMuted },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardHeadText: { flex: 1, gap: 2 },
  iconWrap: { width: 48, height: 48, borderRadius: radii.card, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.ink, fontWeight: '700' },
  body: { color: colors.ink },
  muted: { color: colors.inkMuted },
  warning: { color: colors.amber, fontWeight: '600' },
  primary: {
    minHeight: minTouchTarget,
    backgroundColor: colors.red,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.surface, fontWeight: '700' },
  secondary: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.green,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryOn: { backgroundColor: colors.greenTint },
  secondaryText: { color: colors.surface, fontWeight: '700' },
  secondaryTextOn: { color: colors.green },
  reportLink: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  reportLinkText: { color: colors.inkMuted, fontWeight: '600' },
  reportBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: 2,
  },
  reportPrompt: { color: colors.inkMuted, marginBottom: spacing.xs },
  reportOption: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  reportOptionText: { color: colors.ink, fontWeight: '600' },
});
