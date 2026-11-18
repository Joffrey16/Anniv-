// Export des anniversaires et rappels vers le calendrier du téléphone (.ics, RFC 5545).
// Utile surtout pour la version web : c'est le Calendrier de l'iPhone qui envoie les alertes.
import { nextBirthday } from './dates.ts';
import type { Person, Settings } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** Décalage (en minutes) par rapport au début de la journée d'anniversaire. */
export function alarmTrigger(daysBefore: number, hour: number, minute: number): string {
  const m = -daysBefore * 1440 + hour * 60 + minute;
  return m < 0 ? `-PT${-m}M` : `PT${m}M`;
}

// Lignes de 75 octets max (repli RFC 5545), en UTF-8.
function fold(line: string): string {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (bytes + b > 73) { out.push(cur); cur = ' '; bytes = 1; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
}

export function buildIcs(people: Person[], settings: Settings, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Anniv !//FR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Anniversaires (Anniv !)'];
  for (const p of people) {
    const start = nextBirthday(p, now);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    const desc = [p.year ? `Né·e en ${p.year}` : '', p.giftIdeas ? `Idées cadeau : ${p.giftIdeas}` : '', p.notes ?? ''].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT', `UID:anniv-${p.id}@anniv.app`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(end)}`,
      // 29 février : on répète au 29 (le calendrier l'affiche les années bissextiles).
      'RRULE:FREQ=YEARLY', `SUMMARY:${esc(`🎂 Anniversaire de ${p.name}`)}`, 'TRANSP:TRANSPARENT');
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
    for (const r of settings.reminders) {
      if (!r.enabled || (r.kind === 'cadeau' && !p.giftNeeded)) continue;
      const text = r.kind === 'cadeau' ? `🎁 Cadeau pour ${p.name}` : `🎂 Souhaiter l'anniversaire de ${p.name}`;
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(text)}`, `TRIGGER:${alarmTrigger(r.daysBefore, r.hour, r.minute)}`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
