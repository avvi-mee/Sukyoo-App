import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import notifee, { AndroidCategory, AndroidImportance } from 'react-native-notify-kit';

export const BACKGROUND_NOTIFICATION_TASK = 'SUKYOO_BACKGROUND_NOTIFICATION_TASK';

// The sos-trigger Edge Function sends a data-only FCM message (see
// supabase/functions/sos-trigger) specifically so this task — not the OS's
// default notification tray — decides how to present it, even when the app
// is fully killed. See expo-notifications' NotificationTaskPayload type:
// the data payload arrives either spread onto `data` directly or JSON-encoded
// in `data.dataString`, depending on platform/delivery path — handle both.
TaskManager.defineTask<Notifications.NotificationTaskPayload>(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error || !data || 'actionIdentifier' in data) return;

  const raw = data.data ?? {};
  const payload: Record<string, unknown> = typeof raw.dataString === 'string' ? JSON.parse(raw.dataString) : raw;

  if (payload.type === 'sos') {
    await notifee.displayNotification({
      title: 'Emergency SOS',
      body: 'A family member needs help now.',
      data: payload as Record<string, string>,
      android: {
        channelId: 'sos',
        category: AndroidCategory.CALL,
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' },
        fullScreenAction: { id: 'default' },
      },
    });
  } else if (payload.type === 'incoming_call') {
    await notifee.displayNotification({
      title: 'Incoming video call',
      body: 'Tap to answer',
      data: payload as Record<string, string>,
      android: {
        channelId: 'incoming-call',
        category: AndroidCategory.CALL,
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' },
        fullScreenAction: { id: 'default' },
      },
    });
  }
});

export async function registerBackgroundNotificationTask() {
  await notifee.createChannel({
    id: 'sos',
    name: 'Emergency SOS',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    bypassDnd: true,
    vibration: true,
  });
  await notifee.createChannel({
    id: 'incoming-call',
    name: 'Incoming calls',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    bypassDnd: true,
    vibration: true,
  });
  await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch((e) =>
    console.warn('Failed to register background notification task', e)
  );
}
