import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { queryClient, useSession } from '@sukyoo/core';
import { EmailSignInScreen } from './src/screens/auth/EmailSignInScreen';
import { LinkSeniorScreen } from './src/screens/LinkSeniorScreen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { ActiveSeniorProvider, useActiveSenior } from './src/state/ActiveSeniorContext';
import { usePushTokenRegistration } from './src/notifications/usePushTokenRegistration';
import { useNotifeeNavigation } from './src/notifications/useNotifeeNavigation';
import { registerBackgroundNotificationTask } from './src/notifications/backgroundTask';
import { useEffect } from 'react';
import { ReleaseGate } from './src/components/ReleaseGate';
import { Sentry } from './src/observability/sentry';
import { colors } from './src/theme/tokens';

function AppShell() {
  const { session } = useSession();
  const { seniors, isLoading } = useActiveSenior();

  usePushTokenRegistration(session?.user.id);
  useNotifeeNavigation();

  useEffect(() => {
    registerBackgroundNotificationTask();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!seniors.length) return <LinkSeniorScreen />;

  return <RootNavigator />;
}

function AuthGate() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!session) return <EmailSignInScreen />;

  return (
    <ActiveSeniorProvider>
      <AppShell />
    </ActiveSeniorProvider>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="auto" />
          {/* Above AuthGate, so a locked release stops the app before sign-in. */}
          <ReleaseGate>
            <AuthGate />
          </ReleaseGate>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});

export default Sentry.wrap(App);
