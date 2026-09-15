import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon } from './Icon';
import { colors, radii, spacing } from '../theme/tokens';

// Mirrors apps/senior/src/components/ScreenHeader.tsx — circular back button to
// the left of the title. Auto-hides the button at a stack root, so it is safe
// to use on tab screens too.
export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
}) {
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
          hitSlop={8}
        >
          <Icon name="back" size={22} color={colors.ink} />
        </Pressable>
      ) : null}

      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radii.button,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, gap: 2 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 13, color: colors.inkMuted },
});
