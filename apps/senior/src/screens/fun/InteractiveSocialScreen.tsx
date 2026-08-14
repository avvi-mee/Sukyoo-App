import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFamilyLinks } from '@sukyoo/core';
import { ModuleGridTile } from '../../components/ModuleGridTile';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { navigationRef } from '../../navigation/navigationRef';
import { colors, spacing } from '../../theme/tokens';

const GAMES = [
  { key: 'chess', icon: '♟️', title: 'Chess' },
  { key: 'ludo', icon: '🎲', title: 'Ludo' },
  { key: 'cards', icon: '🃏', title: 'Cards' },
  { key: 'memory', icon: '🧠', title: 'Memory training' },
];

export function InteractiveSocialScreen() {
  const userId = useCurrentUserId();
  const { data: familyLinks } = useFamilyLinks(userId);
  const firstFamilyMember = familyLinks?.[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Games" />
      <View style={styles.grid}>
        {GAMES.map((g) => (
          <ModuleGridTile key={g.key} icon={g.icon} title={g.title} tint={colors.redTint} onPress={() => Alert.alert('Coming soon', `${g.title} is on the way.`)} />
        ))}
      </View>

      <ListRow
        icon="📹"
        title="Video call family"
        subtitle="One tap to call your favourites"
        tint={colors.ink}
        onPress={() =>
          firstFamilyMember
            ? navigationRef.navigate('VideoCall', {
                mode: 'start',
                calleeId: firstFamilyMember.family_member_id,
                calleeName: firstFamilyMember.family_member?.full_name ?? 'Family',
              })
            : Alert.alert('No family linked yet', 'Invite a family member from HealthHub > Insurance & records.')
        }
      />
      <ListRow icon="🕯️" title="Live streamed satsang" subtitle="Tonight, 7:00 PM — coming soon" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
