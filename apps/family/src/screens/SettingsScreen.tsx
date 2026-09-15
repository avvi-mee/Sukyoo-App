import { ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signOut } from '@sukyoo/core';
import { Row } from '../components/Row';
import { useActiveSenior } from '../state/ActiveSeniorContext';
import { colors, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { seniors } = useActiveSenior();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Linked family members</Text>
      {seniors.map((s) => (
        <Row key={s.seniorId} icon="family" title={s.name} />
      ))}
      <Row icon="link" title="Link another family member" onPress={() => navigation.navigate('LinkSenior')} />

      <Text style={[styles.heading, styles.spaced]}>Account</Text>
      <Row
        icon="shield"
        title="Privacy & your data"
        subtitle="Notifications, a copy of your information, delete your account"
        onPress={() => navigation.navigate('Privacy')}
      />
      <Row icon="signOut" title="Sign out" onPress={() => signOut()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  heading: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: spacing.sm },
  spaced: { marginTop: spacing.lg },
});
