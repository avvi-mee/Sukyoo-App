import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signOut } from '@sukyoo/core';
import { BigButton } from '../../components/BigButton';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { colors, fontScaleSteps, fontSize, minTouchTarget, radii, spacing, type FontScaleKey } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';
import type { RootStackParamList } from '../../navigation/types';

const SIZE_OPTIONS: { key: FontScaleKey; label: string }[] = [
  { key: 'default', label: 'Normal' },
  { key: 'large', label: 'Large' },
  { key: 'extraLarge', label: 'Largest' },
];

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { scaleKey, scale, setScaleKey } = useFontScale();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Settings" />

      {/* The whole app already reads this multiplier — it just had no control
          surface until now, so the setting was unreachable. Each option
          previews itself at its own size so the choice is legible before it
          is made. */}
      <Text style={[styles.groupLabel, { fontSize: fontSize.body * scale }]}>Text size</Text>
      <View style={styles.sizeRow}>
        {SIZE_OPTIONS.map((option) => {
          const isSelected = option.key === scaleKey;
          return (
            <Text
              key={option.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setScaleKey(option.key)}
              style={[
                styles.sizeOption,
                { fontSize: fontSize.body * fontScaleSteps[option.key] },
                isSelected && styles.sizeOptionSelected,
              ]}
            >
              {option.label}
            </Text>
          );
        })}
      </View>

      <SectionHeader title="Family" />
      <ListRow
        icon="family"
        title="Family & sharing"
        subtitle="Choose what each family member can see"
        onPress={() => navigation.navigate('FamilySharing')}
      />

      <SectionHeader title="Privacy" />
      <ListRow
        icon="shield"
        title="Privacy & your data"
        subtitle="Notifications, a copy of your information, delete your account"
        onPress={() => navigation.navigate('Privacy')}
      />

      <BigButton label="Sign out" variant="secondary" onPress={() => signOut()} style={styles.signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  groupLabel: { color: colors.inkMuted, fontWeight: '600', marginBottom: spacing.xs },
  sizeRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg, alignItems: 'center' },
  sizeOption: {
    flex: 1,
    minHeight: minTouchTarget,
    textAlignVertical: 'center',
    textAlign: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontWeight: '700',
    overflow: 'hidden',
  },
  sizeOptionSelected: { backgroundColor: colors.coral, borderColor: colors.coral, color: '#fff' },
  signOut: { marginTop: spacing.xl },
});
