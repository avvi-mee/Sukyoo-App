import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ModuleGridTile } from '../../components/ModuleGridTile';
import { SectionHeader } from '../../components/SectionHeader';
import { colors, spacing } from '../../theme/tokens';
import type { FunStackParamList } from '../../navigation/types';

const MODULES: { key: keyof FunStackParamList; icon: string; title: string; subtitle: string }[] = [
  { key: 'DigitalContent', icon: '🎬', title: 'Digital content', subtitle: 'Cinema, music & audiobooks' },
  { key: 'InteractiveSocial', icon: '🎮', title: 'Interactive & social', subtitle: 'Games & video calling' },
  { key: 'LearningHobbies', icon: '🎨', title: 'Learning & hobbies', subtitle: 'Classes for every interest' },
  { key: 'Community', icon: '💬', title: 'Community', subtitle: 'Forums, stories & celebrations' },
];

export function FunLandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<FunStackParamList>>();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Entertainment" />
      <View style={styles.grid}>
        {MODULES.map((m) => (
          <ModuleGridTile key={m.key} icon={m.icon} title={m.title} subtitle={m.subtitle} tint={colors.redTint} onPress={() => navigation.navigate(m.key as any)} />
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
