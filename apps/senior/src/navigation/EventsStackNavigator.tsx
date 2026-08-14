import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EventsLandingScreen } from '../screens/events/EventsLandingScreen';
import { LocalEventsScreen } from '../screens/events/LocalEventsScreen';
import { TravelToursScreen } from '../screens/events/TravelToursScreen';
import { TripCompanionsScreen } from '../screens/events/TripCompanionsScreen';
import { SocialEngagementScreen } from '../screens/events/SocialEngagementScreen';
import { LogisticsScreen } from '../screens/events/LogisticsScreen';
import { colors } from '../theme/tokens';
import type { EventsStackParamList } from './types';

const Stack = createNativeStackNavigator<EventsStackParamList>();

export function EventsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink }}>
      <Stack.Screen name="EventsLanding" component={EventsLandingScreen} options={{ title: 'Events & Tours' }} />
      <Stack.Screen name="LocalEvents" component={LocalEventsScreen} options={{ title: 'Local events' }} />
      <Stack.Screen name="TravelTours" component={TravelToursScreen} options={{ title: 'Travel & tours' }} />
      <Stack.Screen name="TripCompanions" component={TripCompanionsScreen} options={{ title: 'Trip details' }} />
      <Stack.Screen name="SocialEngagement" component={SocialEngagementScreen} options={{ title: 'Social engagement' }} />
      <Stack.Screen name="Logistics" component={LogisticsScreen} options={{ title: 'Logistics support' }} />
    </Stack.Navigator>
  );
}
