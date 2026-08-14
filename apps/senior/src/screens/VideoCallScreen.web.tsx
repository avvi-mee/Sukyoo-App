import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BigButton } from '../components/BigButton';
import { colors, fontSize, spacing } from '../theme/tokens';

// Web build only — see useAgoraEngine.web.ts. Video calling needs
// react-native-agora's native SDK, which has no web target.
export function VideoCallScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Video calling isn't available on web yet</Text>
      <Text style={styles.subtitle}>Use the Sukyoo app on your phone to make a video call.</Text>
      <BigButton label="Go back" onPress={() => navigation.goBack()} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  title: { color: '#fff', fontSize: fontSize.title, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#ccc', fontSize: fontSize.body, textAlign: 'center' },
  button: { marginTop: spacing.md },
});
