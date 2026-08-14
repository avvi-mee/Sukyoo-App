import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabsNavigator } from './MainTabsNavigator';
import { VideoCallScreen } from '../screens/VideoCallScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<Omit<RootStackParamList, 'Auth'>>();

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabsNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ presentation: 'fullScreenModal', headerShown: false }} />
    </Stack.Navigator>
  );
}
