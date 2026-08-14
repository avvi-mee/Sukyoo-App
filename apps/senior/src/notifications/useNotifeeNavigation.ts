import { useEffect } from 'react';
import notifee, { EventType } from 'react-native-notify-kit';
import { navigationRef } from '../navigation/navigationRef';

function navigateToIncomingCall(data: Record<string, unknown> | undefined) {
  if (!data || data.type !== 'incoming_call' || !data.call_session_id) return;
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('VideoCall', { mode: 'answer', callSessionId: String(data.call_session_id) });
}

// Mirrors apps/family/src/notifications/useNotifeeNavigation.ts.
export function useNotifeeNavigation() {
  useEffect(() => {
    notifee.getInitialNotification().then((initial) => {
      if (initial) navigateToIncomingCall(initial.notification.data as Record<string, unknown>);
    });

    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        navigateToIncomingCall(detail.notification?.data as Record<string, unknown>);
      }
    });

    return unsubscribe;
  }, []);
}
