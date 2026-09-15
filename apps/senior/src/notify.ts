import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert is a hard no-op (see node_modules/react-native-web/dist/exports/Alert) —
// every caller needs this instead of Alert directly, or the message silently vanishes on web.
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}
