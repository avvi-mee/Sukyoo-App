import { useEffect } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { queryClient, useSession } from '@sukyoo/core';
import { FontScaleProvider } from './src/theme/FontScaleContext';
import { PhoneSignInScreen } from './src/screens/auth/PhoneSignInScreen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { CallCareButton } from './src/components/CallCareButton';
import { usePushTokenRegistration } from './src/notifications/usePushTokenRegistration';
import { useNotifeeNavigation } from './src/notifications/useNotifeeNavigation';
import { registerBackgroundNotificationTask } from './src/notifications/backgroundTask';
import { Sentry } from './src/observability/sentry';
import { colors } from './src/theme/tokens';

function AppShell() {
  const { session, loading } = useSession();

  usePushTokenRegistration(session?.user.id);
  useNotifeeNavigation();

  useEffect(() => {
    registerBackgroundNotificationTask();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.coral} />
      </SafeAreaView>
    );
  }

  if (!session) return <PhoneSignInScreen />;

  return (
    <View style={styles.fill}>
      <RootNavigator />
      <CallCareButton />
    </View>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <FontScaleProvider>
            <NavigationContainer ref={navigationRef}>
              <StatusBar style="auto" />
              <AppShell />
            </NavigationContainer>
          </FontScaleProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});

export default Sentry.wrap(App);
