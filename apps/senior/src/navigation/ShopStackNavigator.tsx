import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ShopLandingScreen } from '../screens/shop/ShopLandingScreen';
import { CoreCategoriesScreen } from '../screens/shop/CoreCategoriesScreen';
import { ProductListScreen } from '../screens/shop/ProductListScreen';
import { ConvenienceScreen } from '../screens/shop/ConvenienceScreen';
import { ServicesMarketplaceScreen } from '../screens/shop/ServicesMarketplaceScreen';
import { TrustEaseScreen } from '../screens/shop/TrustEaseScreen';
import { colors } from '../theme/tokens';
import type { ShopStackParamList } from './types';

const Stack = createNativeStackNavigator<ShopStackParamList>();

export function ShopStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink }}>
      <Stack.Screen name="ShopLanding" component={ShopLandingScreen} options={{ title: 'Shop' }} />
      <Stack.Screen name="CoreCategories" component={CoreCategoriesScreen} options={{ title: 'Core categories' }} />
      <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Products' }} />
      <Stack.Screen name="Convenience" component={ConvenienceScreen} options={{ title: 'Convenience' }} />
      <Stack.Screen name="ServicesMarketplace" component={ServicesMarketplaceScreen} options={{ title: 'Services marketplace' }} />
      <Stack.Screen name="TrustEase" component={TrustEaseScreen} options={{ title: 'Trust & ease' }} />
    </Stack.Navigator>
  );
}
