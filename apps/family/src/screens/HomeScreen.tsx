import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useActiveSOSEvents } from '@sukyoo/core';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Row } from '../components/Row';
import { useActiveSenior } from '../state/ActiveSeniorContext';
import { colors, radii, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { seniors, activeSenior, setActiveSeniorId } = useActiveSenior();

  // Watches every linked senior, not just the selected one — an emergency for
  // the parent you weren't currently looking at is the case that matters most.
  const { data: sosEvents } = useActiveSOSEvents(seniors.map((s) => s.seniorId));
  const nameFor = (seniorId: string) => seniors.find((s) => s.seniorId === seniorId)?.name ?? 'Your family member';

  function openAlert(sosEventId: string, seniorId: string) {
    setActiveSeniorId(seniorId);
    navigation.navigate('SOSAlert', { sosEventId, seniorId });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hello</Text>

      {(sosEvents ?? []).map((event) => (
        <Card key={event.id} style={styles.sosCard}>
          <View style={styles.sosTitleRow}>
            <Icon name="emergency" size={20} color={colors.danger} />
            <Text style={styles.sosTitle}>Emergency SOS active</Text>
          </View>
          <Text style={styles.sosSubtitle}>
            {nameFor(event.senior_id)} triggered an SOS — status: {event.status}
          </Text>
          <Text style={styles.sosAction} onPress={() => openAlert(event.id, event.senior_id)}>
            Open alert
          </Text>
        </Card>
      ))}

      {seniors.length > 1 ? (
        <View style={styles.switcherRow}>
          {seniors.map((s) => (
            <Text
              key={s.seniorId}
              accessibilityRole="button"
              accessibilityState={{ selected: s.seniorId === activeSenior?.seniorId }}
              onPress={() => setActiveSeniorId(s.seniorId)}
              style={[styles.chip, s.seniorId === activeSenior?.seniorId && styles.chipActive]}
            >
              {s.name}
            </Text>
          ))}
        </View>
      ) : null}

      {activeSenior ? (
        <>
          <Row
            icon="video"
            title={`Video call ${activeSenior.name}`}
            onPress={() =>
              navigation.navigate('VideoCall', { mode: 'start', calleeId: activeSenior.seniorId, calleeName: activeSenior.name })
            }
          />
          {/* These three used to render with no onPress at all. They mirror the
              tabs deliberately — the tab bar is easy to miss, and this is the
              screen a worried family member lands on. */}
          <Row
            icon="health"
            title={`${activeSenior.name}'s health`}
            subtitle="Vitals, records, medication adherence"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Health' })}
          />
          <Row
            icon="story"
            title={`${activeSenior.name}'s stories`}
            subtitle="Recordings they have shared with you"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Stories' })}
          />
          <Row
            icon="gift"
            title="Send something"
            subtitle={`Order essentials for ${activeSenior.name}`}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Orders' })}
          />
        </>
      ) : (
        <Text style={styles.empty}>Not linked to anyone yet — go to Settings to link a family member.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.ink },
  switcherRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.inkMuted,
    overflow: 'hidden',
  },
  chipActive: { backgroundColor: colors.primary, color: '#fff', borderColor: colors.primary },
  sosCard: { backgroundColor: colors.dangerTint, borderColor: colors.danger },
  sosTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
  sosTitle: { color: colors.danger, fontWeight: '800', fontSize: 16 },
  sosSubtitle: { color: colors.danger },
  sosAction: {
    marginTop: spacing.sm,
    backgroundColor: colors.danger,
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    overflow: 'hidden',
  },
  empty: { color: colors.inkMuted, marginTop: spacing.lg, textAlign: 'center' },
});
