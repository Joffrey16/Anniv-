// Calcul des rappels à venir (sans dépendance à React Native) :
// sert aux notifications locales du téléphone et au planning envoyé au serveur de notifications.
import { nextBirthday, upcomingAge } from './dates.ts';
import { ageLabel, eventTitle, kindOf, openIdeasText } from './insights.ts';
import type { Person, ReminderRule, Settings } from './types';

export type PlannedReminder = {
  id: string; // personne:règle:date, sert à éviter les doublons
  at: number; // horodatage (ms)
  title: string;
  body: string;
  personId: string;
  kind: ReminderRule['kind'];
};

const DAY = 86400000;

function fireDate(bday: Date, rule: ReminderRule): Date {
  const d = new Date(bday);
  d.setDate(d.getDate() - rule.daysBefore);
  d.setHours(rule.hour, rule.minute, 0, 0);
  return d;
}

/** Rappel déjà inutile : message déjà envoyé ou cadeau déjà acheté pour cette occurrence. */
function alreadyDone(p: Person, rule: ReminderRule, bday: Date) {
  const t = p.track?.[String(bday.getFullYear())];
  return rule.kind === 'souhaiter' ? Boolean(t?.wished) : Boolean(t?.bought);
}

export function reminderText(p: Person, rule: ReminderRule, bday: Date) {
  const age = upcomingAge(p, bday);
  const al = ageLabel(p, age);
  const ageTxt = al ? ` (${al})` : '';
  const title = eventTitle(p);
  const when = rule.daysBefore === 0 ? "aujourd'hui" : rule.daysBefore === 1 ? 'demain' : `dans ${rule.daysBefore} jours`;
  const ideas = openIdeasText(p);
  if (rule.kind === 'cadeau') {
    return {
      title: `🎁 Cadeau pour ${p.name}`,
      body: `${title} ${when}${ageTxt}.${ideas ? ` Idées : ${ideas}` : ' Pense à trouver un cadeau !'}`,
    };
  }
  const emoji = kindOf(p) === 'fete' ? '🌸' : kindOf(p) === 'couple' ? '💍' : '🎂';
  return {
    title: rule.daysBefore === 0 ? `${emoji} ${title}, c'est aujourd'hui !` : `${emoji} ${title} ${when}`,
    body: rule.daysBefore === 0 ? `Touche ici pour envoyer ton message${ageTxt} 🎉` : `Prépare un petit mot${ageTxt}.`,
  };
}

/**
 * Rappels à venir, triés par date. Pour chaque personne et chaque règle active,
 * on prend les prochaines occurrences (jusqu'à `perRule`) dans l'horizon donné.
 */
export function planReminders(
  people: Person[], settings: Settings, now = new Date(),
  { max = 60, perRule = 1, horizonDays = 400 }: { max?: number; perRule?: number; horizonDays?: number } = {},
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  const limit = now.getTime() + horizonDays * DAY;
  for (const p of people) {
    for (const rule of settings.reminders) {
      if (!rule.enabled) continue;
      if (rule.kind === 'cadeau' && !p.giftNeeded) continue;
      let from = now;
      let found = 0;
      // On parcourt les anniversaires suivants (le rappel peut tomber l'année d'avant l'anniversaire).
      for (let guard = 0; guard < perRule + 2 && found < perRule; guard++) {
        const bday = nextBirthday(p, from);
        const at = fireDate(bday, rule);
        from = new Date(bday.getFullYear(), bday.getMonth(), bday.getDate() + 1);
        if (at.getTime() <= now.getTime()) continue;
        if (at.getTime() > limit) break;
        found++;
        if (alreadyDone(p, rule, bday)) continue;
        const ymd = `${bday.getFullYear()}-${bday.getMonth() + 1}-${bday.getDate()}`;
        out.push({ id: `${p.id}:${rule.id}:${ymd}`, at: at.getTime(), personId: p.id, kind: rule.kind, ...reminderText(p, rule, bday) });
      }
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, max);
}
