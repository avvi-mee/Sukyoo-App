import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ModuleGridTile } from '../../components/ModuleGridTile';
import { SectionHeader } from '../../components/SectionHeader';
import { colors, spacing } from '../../theme/tokens';
import type { HealthStackParamList } from '../../navigation/types';

const MODULES: { key: keyof HealthStackParamList; icon: string; title: string; subtitle: string }[] = [
  { key: 'MedicalCare', icon: '👩‍⚕️', title: 'Medical care', subtitle: 'Doctors & consultations' },
  { key: 'Diagnostics', icon: '🩸', title: 'Diagnostics', subtitle: 'Vitals & lab tests' },
  { key: 'Medication', icon: '💊', title: 'Medication', subtitle: "Today's doses" },
  { key: 'Emergency', icon: '🚨', title: 'Emergency', subtitle: 'SOS & ambulance' },
  { key: 'HomeCare', icon: '🏠', title: 'Home care', subtitle: 'Nursing & caregivers' },
  { key: 'Wellness', icon: '🧘', title: 'Wellness', subtitle: 'Programs & live sessions' },
  { key: 'Insurance', icon: '📋', title: 'Insurance', subtitle: 'Policy, claims & records' },
];

export function HealthLandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HealthStackParamList>>();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="HealthHub" subtitle="7 ways we look after you" />
      <View style={styles.grid}>
        {MODULES.map((m) => (
          <ModuleGridTile
            key={m.key}
            icon={m.icon}
            title={m.title}
            subtitle={m.subtitle}
            // React Navigation's `navigate` overloads are keyed per literal
            // screen name; iterating a static config list over them doesn't
            // narrow, so this one dynamic dispatch needs the escape hatch.
            onPress={() => navigation.navigate(m.key as any)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
