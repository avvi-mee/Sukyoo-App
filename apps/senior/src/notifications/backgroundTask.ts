import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import notifee, { AndroidCategory, AndroidImportance } from 'react-native-notify-kit';

export const BACKGROUND_NOTIFICATION_TASK = 'SUKYOO_BACKGROUND_NOTIFICATION_TASK';

// Mirrors apps/family/src/notifications/backgroundTask.ts — the senior app
// only needs to handle incoming video calls (it's the one that triggers
// SOS, never receives it). See that file for the payload-shape reasoning.
TaskManager.defineTask<Notifications.NotificationTaskPayload>(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error || !data || 'actionIdentifier' in data) return;

  const raw = data.data ?? {};
  const payload: Record<string, unknown> = typeof raw.dataString === 'string' ? JSON.parse(raw.dataString) : raw;

  if (payload.type === 'incoming_call') {
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
      // fullScreenAction and channels are Android-only; without this block an
      // incoming call on iOS is an ordinary banner. See the family app's copy
      // for the CallKit/PushKit caveat.
      ios: { sound: 'default', interruptionLevel: 'timeSensitive' },
    });
  }
});

export async function registerBackgroundNotificationTask() {
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
