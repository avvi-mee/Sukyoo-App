import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWatchProgress } from '@sukyoo/core';
import { HeroBanner } from '../../components/HeroBanner';
import type { IconName } from '../../components/Icon';
import { ModuleGridTile } from '../../components/ModuleGridTile';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, spacing } from '../../theme/tokens';
import type { FunStackParamList } from '../../navigation/types';

const MODULES: { key: keyof FunStackParamList; icon: IconName; title: string; subtitle: string }[] = [
  { key: 'DigitalContent', icon: 'play', title: 'Digital content', subtitle: 'Movies, music & audiobooks' },
  { key: 'Livestreams', icon: 'radio', title: 'Live programmes', subtitle: 'Bhajans, talks & classes' },
  { key: 'InteractiveSocial', icon: 'person', title: 'Interactive & social', subtitle: 'Games & video calls' },
  { key: 'LearningHobbies', icon: 'learning', title: 'Learning & hobbies', subtitle: 'Classes for curious minds' },
  { key: 'Community', icon: 'community', title: 'Community', subtitle: 'Forums & storytelling' },
];

export function FunLandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<FunStackParamList>>();
  const userId = useCurrentUserId();
  const { data: progress } = useWatchProgress(userId);

  // Renders only when there is genuine saved progress. The content library is
  // deliberately empty until licensing deals close, so on a fresh install this
  // hero simply isn't there rather than advertising a film we cannot play.
  const resume = (progress ?? []).find((p) => p.content?.title && p.position_seconds > 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Entertainment" subtitle="Something for every mood" />

      {resume ? (
        <HeroBanner
          accent="red"
          icon="play"
          title="Continue watching"
          subtitle={`${resume.content!.title} · ${Math.round(resume.position_seconds / 60)} min in`}
          onPress={() => navigation.navigate('DigitalContent')}
        />
      ) : null}

      <View style={styles.grid}>
        {MODULES.map((m) => (
          <ModuleGridTile
            key={m.key}
            icon={m.icon}
            title={m.title}
            subtitle={m.subtitle}
            tint={colors.redTint}
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
