import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useActiveSOSEvent } from '@sukyoo/core';
import { Card } from '../components/Card';
import { Row } from '../components/Row';
import { useActiveSenior } from '../state/ActiveSeniorContext';
import { colors, radii, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { seniors, activeSenior, setActiveSeniorId } = useActiveSenior();
  const { data: sosEvent } = useActiveSOSEvent(activeSenior?.seniorId);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hello</Text>

      {seniors.length > 1 ? (
        <View style={styles.switcherRow}>
          {seniors.map((s) => (
            <Text
              key={s.seniorId}
              onPress={() => setActiveSeniorId(s.seniorId)}
              style={[styles.chip, s.seniorId === activeSenior?.seniorId && styles.chipActive]}
            >
              {s.name}
            </Text>
          ))}
        </View>
      ) : null}

      {sosEvent ? (
        <Card style={styles.sosCard}>
          <Text style={styles.sosTitle}>🚨 Emergency SOS active</Text>
          <Text style={styles.sosSubtitle}>{activeSenior?.name} triggered an SOS — status: {sosEvent.status}</Text>
        </Card>
      ) : null}

      {activeSenior ? (
        <>
          <Row
            icon="📹"
            title={`Video call ${activeSenior.name}`}
            onPress={() => navigation.navigate('VideoCall', { mode: 'start', calleeId: activeSenior.seniorId, calleeName: activeSenior.name })}
          />
          <Row icon="🩺" title={`${activeSenior.name}'s health`} subtitle="Vitals, records, medication adherence" />
          <Row icon="📋" title="Insurance & claims" subtitle="View shared policy & claims" />
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
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.chip, borderWidth: 1, borderColor: colors.border, color: colors.inkMuted, overflow: 'hidden' },
  chipActive: { backgroundColor: colors.primary, color: '#fff', borderColor: colors.primary },
  sosCard: { backgroundColor: colors.dangerTint, borderColor: colors.danger },
  sosTitle: { color: colors.danger, fontWeight: '800', fontSize: 16, marginBottom: 4 },
  sosSubtitle: { color: colors.danger },
  empty: { color: colors.inkMuted, marginTop: spacing.lg, textAlign: 'center' },
});
