import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { planReminders } from './reminderPlan';
import { Person, Settings } from './types';

// iOS limite à 64 notifications programmées : on garde les plus proches
// et on reprogramme à chaque ouverture de l'app ou modification.
const MAX_SCHEDULED = 60;

export const notificationsSupported = Platform.OS !== 'web';

if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensurePermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('anniversaires', {
      name: 'Anniversaires',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#FF6B6B',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function rescheduleAll(people: Person[], settings: Settings): Promise<number> {
  if (!notificationsSupported) return 0;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const planned = planReminders(people, settings, new Date(), { max: MAX_SCHEDULED, perRule: 2 });
  for (const n of planned) {
    await Notifications.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, data: { personId: n.personId, kind: n.kind } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(n.at), channelId: 'anniversaires' },
    });
  }
  return planned.length;
}

export async function sendTestNotification() {
  if (!(await ensurePermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: '🎂 Test Anniv !', body: 'Les rappels fonctionnent 🎉' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: 'anniversaires' },
  });
  return true;
}
