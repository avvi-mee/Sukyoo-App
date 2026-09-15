import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useContentItems } from '@sukyoo/core';
import type { IconName } from '../../components/Icon';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatusPill } from '../../components/StatusPill';
import { notify } from '../../notify';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

const CATEGORIES: { key: string; title: string; icon: IconName; note: string; tint: string }[] = [
  { key: 'nostalgia_cinema', title: 'Nostalgia cinema', icon: 'film', note: 'Classic Hindi & regional films', tint: colors.redTint },
  { key: 'devotional_music', title: 'Devotional & classical', icon: 'music', note: 'Curated music playlists', tint: colors.greenTint },
  { key: 'audiobook', title: 'Audiobooks & podcasts', icon: 'audiobook', note: 'Large-print, audio-first library', tint: colors.amberTint },
  { key: 'live_radio', title: 'Live TV & radio', icon: 'radio', note: 'Watch your favourite channels live', tint: colors.coralTint },
];

export function DigitalContentScreen() {
  const { scale } = useFontScale();
  const { data: items } = useContentItems();

  const countByCategory = new Map<string, number>();
  for (const item of items ?? []) {
    const key = item.category ?? '';
    countByCategory.set(key, (countByCategory.get(key) ?? 0) + 1);
  }
  const anyContent = (items ?? []).length > 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Digital content" subtitle="Watch, listen & read" />

      {CATEGORIES.map((c) => {
        const count = countByCategory.get(c.key) ?? 0;
        return (
          <ListRow
            key={c.key}
            icon={c.icon}
            title={c.title}
            subtitle={c.note}
            tint={c.tint}
            trailing={
              count ? (
                <StatusPill label={`${count}`} tone="info" />
              ) : (
                <StatusPill label="Soon" tone="neutral" />
              )
            }
            onPress={
              count
                ? undefined
                : () =>
                    notify(
                      c.title,
                      "We're finishing the licensing for this library. It'll appear here the moment it's ready."
                    )
            }
          />
        );
      })}

      {/* Honest about why this is empty rather than pretending it's loading.
          Shipping placeholder film titles would imply rights we don't hold. */}
      {!anyContent ? (
        <View style={styles.notice}>
          <Text style={[styles.noticeTitle, { fontSize: fontSize.body * scale }]}>Library opening soon</Text>
          <Text style={[styles.noticeBody, { fontSize: fontSize.label * scale }]}>
            We only add films, music and books once they're properly licensed, so nothing here is a placeholder. Your other
            Sukyoo features are unaffected.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl * 2 },
  notice: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.md,
    gap: 4,
    marginTop: spacing.sm,
  },
  noticeTitle: { color: colors.ink, fontWeight: '700' },
  noticeBody: { color: colors.inkMuted },
});
