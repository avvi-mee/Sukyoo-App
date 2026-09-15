import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabsNavigator } from './MainTabsNavigator';
import { LinkSeniorScreen } from '../screens/LinkSeniorScreen';
import { SOSAlertScreen } from '../screens/SOSAlertScreen';
import { PrivacyScreen } from '../screens/PrivacyScreen';
import { VideoCallScreen } from '../screens/VideoCallScreen';
import { colors } from '../theme/tokens';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink }}>
      <Stack.Screen name="MainTabs" component={MainTabsNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="LinkSenior" component={LinkSeniorScreen} options={{ title: 'Link a family member' }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy & your data' }} />
      <Stack.Screen name="SOSAlert" component={SOSAlertScreen} options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ presentation: 'fullScreenModal', headerShown: false }} />
    </Stack.Navigator>
  );
}
