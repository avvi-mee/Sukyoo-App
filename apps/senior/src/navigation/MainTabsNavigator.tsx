import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeDashboardScreen } from '../screens/home/HomeDashboardScreen';
import { HealthStackNavigator } from './HealthStackNavigator';
import { ShopStackNavigator } from './ShopStackNavigator';
import { EventsStackNavigator } from './EventsStackNavigator';
import { FunStackNavigator } from './FunStackNavigator';
import { colors } from '../theme/tokens';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICON: Record<keyof MainTabParamList, string> = {
  Home: '🏠',
  Health: '🩺',
  Shop: '🛒',
  Events: '🎉',
  Fun: '🎬',
};

export function MainTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{TAB_ICON[route.name as keyof MainTabParamList]}</Text>,
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
