import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabsNavigator } from './MainTabsNavigator';
import { VideoCallScreen } from '../screens/VideoCallScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { FamilySharingScreen } from '../screens/settings/FamilySharingScreen';
import { PrivacyScreen } from '../screens/settings/PrivacyScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<Omit<RootStackParamList, 'Auth'>>();

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabsNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="FamilySharing" component={FamilySharingScreen} options={{ title: 'Family & sharing' }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy & your data' }} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ presentation: 'fullScreenModal', headerShown: false }} />
    </Stack.Navigator>
  );
}
