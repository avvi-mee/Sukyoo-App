import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FunLandingScreen } from '../screens/fun/FunLandingScreen';
import { DigitalContentScreen } from '../screens/fun/DigitalContentScreen';
import { InteractiveSocialScreen } from '../screens/fun/InteractiveSocialScreen';
import { LearningHobbiesScreen } from '../screens/fun/LearningHobbiesScreen';
import { CommunityScreen } from '../screens/fun/CommunityScreen';
import { LivestreamsScreen } from '../screens/fun/LivestreamsScreen';
import { LifeStoryRecorderScreen } from '../screens/fun/LifeStoryRecorderScreen';
import { colors } from '../theme/tokens';
import type { FunStackParamList } from './types';

const Stack = createNativeStackNavigator<FunStackParamList>();

export function FunStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink }}>
      <Stack.Screen name="FunLanding" component={FunLandingScreen} options={{ title: 'Entertainment' }} />
      <Stack.Screen name="DigitalContent" component={DigitalContentScreen} options={{ title: 'Digital content' }} />
      <Stack.Screen name="InteractiveSocial" component={InteractiveSocialScreen} options={{ title: 'Interactive & social' }} />
      <Stack.Screen name="LearningHobbies" component={LearningHobbiesScreen} options={{ title: 'Learning & hobbies' }} />
      <Stack.Screen name="Community" component={CommunityScreen} options={{ title: 'Community' }} />
      <Stack.Screen name="Livestreams" component={LivestreamsScreen} options={{ title: "Live programmes" }} />
      <Stack.Screen name="LifeStoryRecorder" component={LifeStoryRecorderScreen} options={{ title: 'Your life story' }} />
    </Stack.Navigator>
  );
}
