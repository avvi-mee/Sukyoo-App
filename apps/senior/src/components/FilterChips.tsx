import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../theme/tokens';
import { useFontScale } from '../theme/FontScaleContext';

export type FilterChip<T extends string> = { key: T; label: string };

// The pill row above filterable lists (doctor consult modes, event
// categories). Horizontally scrollable rather than wrapped so it survives the
// 1.3x font scale without reflowing the list below it.
export function FilterChips<T extends string>({
  chips,
  selected,
  onSelect,
  accent = colors.coral,
}: {
  chips: readonly FilterChip<T>[];
  selected: T;
  onSelect: (key: T) => void;
  accent?: string;
}) {
  const { scale } = useFontScale();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {chips.map((chip) => {
        const isSelected = chip.key === selected;
        return (
          <Pressable
            key={chip.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={chip.label}
            onPress={() => onSelect(chip.key)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: isSelected ? accent : colors.surface, borderColor: isSelected ? accent : colors.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[styles.label, { color: isSelected ? '#fff' : colors.ink, fontSize: fontSize.label * scale }]}
              numberOfLines={1}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginBottom: spacing.sm },
  row: { gap: spacing.xs, paddingRight: spacing.md },
  chip: {
    minHeight: minTouchTarget * 0.8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '700' },
});
