import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, type IconName } from '../components/Icon';
import { HomeDashboardScreen } from '../screens/home/HomeDashboardScreen';
import { HealthStackNavigator } from './HealthStackNavigator';
import { ShopStackNavigator } from './ShopStackNavigator';
import { EventsStackNavigator } from './EventsStackNavigator';
import { FunStackNavigator } from './FunStackNavigator';
import { colors } from '../theme/tokens';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICON: Record<keyof MainTabParamList, IconName> = {
  Home: 'home',
  Health: 'vitals',
  Shop: 'cart',
  Events: 'events',
  Fun: 'entertainment',
};

export function MainTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarIcon: ({ color }) => <Icon name={TAB_ICON[route.name as keyof MainTabParamList]} size={22} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeDashboardScreen} />
      <Tab.Screen name="Health" component={HealthStackNavigator} />
      <Tab.Screen name="Shop" component={ShopStackNavigator} />
      <Tab.Screen name="Events" component={EventsStackNavigator} />
      <Tab.Screen name="Fun" component={FunStackNavigator} />
    </Tab.Navigator>
  );
}
