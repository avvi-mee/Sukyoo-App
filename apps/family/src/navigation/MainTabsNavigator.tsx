import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, type IconName } from '../components/Icon';
import { HomeScreen } from '../screens/HomeScreen';
import { SharedRecordsScreen } from '../screens/SharedRecordsScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { StoriesScreen } from '../screens/StoriesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme/tokens';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICON: Record<keyof MainTabParamList, IconName> = {
  Home: 'home',
  Health: 'health',
  Orders: 'orders',
  Stories: 'story',
  Settings: 'settings',
};

export function MainTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarIcon: ({ color }) => <Icon name={TAB_ICON[route.name as keyof MainTabParamList]} size={20} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Health" component={SharedRecordsScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Stories" component={StoriesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
