import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon } from './Icon';
import { colors, fontSize, minTouchTarget, radii, spacing } from '../theme/tokens';
import { useFontScale } from '../theme/FontScaleContext';

// The mockups' screen header: a circular back button sitting to the LEFT of the
// title, not a bar above it. Replaces SectionHeader on any pushed screen.
//
// The back affordance is deliberately its own large round target rather than
// the navigator's default header chevron — the stack header is hidden on these
// screens, and a 60pt circle is a far easier hit for an elderly user than the
// system's ~24pt tap area.
export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  right,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
}) {
  const { scale } = useFontScale();
  const navigation = useNavigation();
  const canGoBack = showBack && navigation.canGoBack();

  return (
    <View style={styles.wrap}>
      {canGoBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          // Widen the touch area beyond the visible circle without growing it.
          hitSlop={8}
        >
          <Icon name="back" size={24} color={colors.ink} />
        </Pressable>
      ) : null}

      <View style={styles.textCol}>
        <Text style={[styles.title, { fontSize: fontSize.headline * 0.85 * scale }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { fontSize: fontSize.label * scale }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backButton: {
    width: minTouchTarget * 0.8,
    height: minTouchTarget * 0.8,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, gap: 2 },
  title: { color: colors.ink, fontWeight: '800' },
  subtitle: { color: colors.inkMuted },
});
