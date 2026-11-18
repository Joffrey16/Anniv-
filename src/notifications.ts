import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { nextBirthday, upcomingAge } from './dates';
import { Person, ReminderRule, Settings } from './types';

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

type Planned = { date: Date; title: string; body: string; personId: string };

export function planReminders(people: Person[], settings: Settings, now = new Date()): Planned[] {
  const out: Planned[] = [];
  for (const p of people) {
    for (const rule of settings.reminders) {
      if (!rule.enabled) continue;
      if (rule.kind === 'cadeau' && !p.giftNeeded) continue;
      const date = fireDate(p, rule, now);
      out.push({ date, personId: p.id, ...message(p, rule, now) });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_SCHEDULED);
}

function fireDate(p: Person, rule: ReminderRule, now: Date): Date {
  const at = (bday: Date) => {
    const d = new Date(bday);
    d.setDate(d.getDate() - rule.daysBefore);
    d.setHours(rule.hour, rule.minute, 0, 0);
    return d;
  };
  const bday = nextBirthday(p, now);
  const first = at(bday);
  if (first > now) return first;
  // Le rappel de cette année est déjà passé : on prend l'anniversaire suivant.
  return at(nextBirthday(p, new Date(bday.getFullYear(), bday.getMonth(), bday.getDate() + 1)));
}

function message(p: Person, rule: ReminderRule, now: Date) {
  const age = upcomingAge(p, now);
  const ageTxt = age ? ` (${age} ans)` : '';
  const when = rule.daysBefore === 0 ? "aujourd'hui" : rule.daysBefore === 1 ? 'demain' : `dans ${rule.daysBefore} jours`;
  if (rule.kind === 'cadeau') {
    return {
      title: `🎁 Cadeau pour ${p.name}`,
      body: `Son anniversaire est ${when}${ageTxt}.${p.giftIdeas ? ` Idées : ${p.giftIdeas}` : ' Pense à trouver un cadeau !'}`,
    };
  }
  return {
    title: rule.daysBefore === 0 ? `🎂 C'est l'anniversaire de ${p.name} !` : `🎂 Anniversaire de ${p.name} ${when}`,
    body: rule.daysBefore === 0 ? `N'oublie pas de lui souhaiter${ageTxt} 🎉` : `Prépare un petit mot${ageTxt}.`,
  };
}

export async function rescheduleAll(people: Person[], settings: Settings): Promise<number> {
  if (!notificationsSupported) return 0;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const planned = planReminders(people, settings);
  for (const n of planned) {
    await Notifications.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, data: { personId: n.personId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.date, channelId: 'anniversaires' },
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
