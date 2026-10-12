// expo-notifications has no web implementation; reminders are kept without one.

export const notificationsSupported = false;

export async function requestNotificationPermission() {
  return false;
}

export async function scheduleReminder(
  _title: string,
  _hour: number,
  _minute: number
): Promise<string> {
  throw new Error('Notifications are not supported on web');
}

export async function cancelNotification(_id: string | null) {}

export async function scheduleRestEnd(_seconds: number): Promise<string | null> {
  return null;
}
