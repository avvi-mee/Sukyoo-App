import { useEffect } from 'react';
import notifee, { EventType } from 'react-native-notify-kit';
import { navigationRef } from '../navigation/navigationRef';

function navigateForNotification(data: Record<string, unknown> | undefined) {
  if (!data || !navigationRef.isReady()) return;

  if (data.type === 'sos' && data.sos_event_id) {
    navigationRef.navigate('SOSAlert', {
      sosEventId: String(data.sos_event_id),
      seniorId: String(data.senior_id ?? ''),
    });
  } else if (data.type === 'incoming_call' && data.call_session_id) {
    navigationRef.navigate('VideoCall', { mode: 'answer', callSessionId: String(data.call_session_id) });
  }
}

// Bridges Notifee's own tap events (it owns the notification it displayed
// in the background task) to React Navigation — both the "tapped while app
// running" and "app was killed, this tap is what launched it" cases.
export function useNotifeeNavigation() {
  useEffect(() => {
    notifee.getInitialNotification().then((initial) => {
      if (initial) navigateForNotification(initial.notification.data as Record<string, unknown>);
    });

    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        navigateForNotification(detail.notification?.data as Record<string, unknown>);
      }
    });

    return unsubscribe;
  }, []);
}
