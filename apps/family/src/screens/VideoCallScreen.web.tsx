import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, spacing } from '../theme/tokens';

// Web build only — see useAgoraEngine.web.ts. Video calling needs
// react-native-agora's native SDK, which has no web target.
export function VideoCallScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Video calling isn't available on web yet</Text>
      <Text style={styles.subtitle}>Use the Sukyoo Family app on your phone to make a video call.</Text>
      <Text style={styles.button} onPress={() => navigation.goBack()}>
        Go back
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#ccc', fontSize: 15, textAlign: 'center' },
  button: { backgroundColor: colors.primary, color: '#fff', fontWeight: '700', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.button, overflow: 'hidden' },
});
