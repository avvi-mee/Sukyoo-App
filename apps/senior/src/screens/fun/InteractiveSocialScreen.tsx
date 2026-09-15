import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFamilyLinks, useWellnessSessions } from '@sukyoo/core';
import { Icon, type IconName } from '../../components/Icon';
import { ModuleGridTile } from '../../components/ModuleGridTile';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatusPill } from '../../components/StatusPill';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { navigationRef } from '../../navigation/navigationRef';
import { notify } from '../../notify';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import type { RootStackParamList } from '../../navigation/types';

// None of these are built. They stay visible because the mockup treats them as
// the section's identity, but each says so on tap rather than opening a shell.
const GAMES: { key: string; icon: IconName; title: string }[] = [
  { key: 'chess', icon: 'chess', title: 'Chess' },
  { key: 'ludo', icon: 'ludo', title: 'Ludo' },
  { key: 'cards', icon: 'cards', title: 'Cards' },
  { key: 'memory', icon: 'memory', title: 'Memory training' },
];

export function InteractiveSocialScreen() {
  const { scale } = useFontScale();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userId = useCurrentUserId();
  const { data: familyLinks } = useFamilyLinks(userId);
  const { data: sessions } = useWellnessSessions();

  const firstFamilyMember = familyLinks?.[0];

  // The "live streamed" row is a real wellness session, not a hardcoded time.
  const nextLive = [...(sessions ?? [])]
    .filter((s) => new Date(s.starts_at).getTime() > Date.now())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Interactive & social" subtitle="Play, connect, laugh" />

      <Text style={[styles.groupLabel, { fontSize: fontSize.label * scale }]}>Games</Text>
      <View style={styles.grid}>
        {GAMES.map((g) => (
          <ModuleGridTile
            key={g.key}
            icon={g.icon}
            title={g.title}
            subtitle="Coming soon"
            tint={colors.redTint}
            onPress={() => notify('Coming soon', `${g.title} is on the way.`)}
          />
        ))}
      </View>

      <View style={styles.callCard}>
        <View style={styles.callTitleRow}>
          <Icon name="video" size={22 * scale} color="#fff" />
          <Text style={[styles.callTitle, { fontSize: fontSize.body * scale }]}>
            {firstFamilyMember ? `Video call ${firstFamilyMember.family_member?.full_name ?? 'family'}` : 'Video call family'}
          </Text>
        </View>
        <Text style={[styles.callSubtitle, { fontSize: fontSize.label * scale }]}>
          {firstFamilyMember ? 'One tap to call your favourites' : 'Link a family member to start calling'}
        </Text>
        <Text
          accessibilityRole="button"
          onPress={() =>
            firstFamilyMember
              ? navigationRef.navigate('VideoCall', {
                  mode: 'start',
                  calleeId: firstFamilyMember.family_member_id,
                  calleeName: firstFamilyMember.family_member?.full_name ?? 'Family',
                })
              : navigation.navigate('FamilySharing')
          }
          style={[styles.callAction, { fontSize: fontSize.label * scale }]}
        >
          {firstFamilyMember ? 'Call now →' : 'Invite someone →'}
        </Text>
      </View>

      {nextLive ? (
        <ListRow
          icon="calendar"
          title={nextLive.title}
          subtitle={`${new Date(nextLive.starts_at).toLocaleDateString('en-IN', { weekday: 'long' })}, ${new Date(nextLive.starts_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`}
          tint={colors.amberTint}
          trailing={<StatusPill label="Live session" tone="info" />}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  groupLabel: { color: colors.inkMuted, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  callCard: { backgroundColor: colors.ink, borderRadius: radii.card, padding: spacing.md, gap: 4 },
  callTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // Flexed because the family member's name is interpolated into the title.
  callTitle: { color: '#fff', fontWeight: '800', flex: 1 },
  callSubtitle: { color: '#D9D2C8' },
  callAction: { color: colors.amber, fontWeight: '800', marginTop: spacing.xs },
});
