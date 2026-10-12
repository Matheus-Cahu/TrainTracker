import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const notificationsSupported = true;

const REMINDERS_CHANNEL = 'reminders';
const REST_CHANNEL = 'rest';
const REST_KIND = 'rest';

// Runs only while the app is in the foreground. The workout screen already
// signals the end of the rest there, so that notification stays silent.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const show = notification.request.content.data?.kind !== REST_KIND;
    return {
      shouldShowBanner: show,
      shouldShowList: show,
      shouldPlaySound: show,
      shouldSetBadge: false,
    };
  },
});

async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL, {
    name: 'Lembretes de suplementos',
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync(REST_CHANNEL, {
    name: 'Fim do descanso',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

async function hasPermission() {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Prompts if needed. On Android 13+ the prompt only appears once a channel exists. */
export async function requestNotificationPermission() {
  await ensureChannels();
  if (await hasPermission()) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Schedules a daily reminder. Assumes permission was already granted. */
export function scheduleReminder(title: string, hour: number, minute: number) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body: 'Hora do seu suplemento. Marque no app quando tomar.' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: REMINDERS_CHANNEL,
    },
  });
}

export async function cancelNotification(id: string | null) {
  if (id) await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Notifies the end of a rest period in case the app is in the background by then.
 * Never prompts: resolves to null when notifications aren't allowed.
 */
export async function scheduleRestEnd(seconds: number) {
  try {
    if (seconds < 1 || !(await hasPermission())) return null;
    await ensureChannels();
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Descanso encerrado',
        body: 'Hora da próxima série.',
        data: { kind: REST_KIND },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.ceil(seconds),
        channelId: REST_CHANNEL,
      },
    });
  } catch (error) {
    console.warn('Failed to schedule rest notification', error);
    return null;
  }
}
