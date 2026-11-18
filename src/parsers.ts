import type { ImportCandidate, Person } from './types';

export type Raw = { name: string; day: number; month: number; year?: number; phone?: string; relation?: Person['relation']; emoji?: string };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function toCandidates(raws: Raw[], existing: Person[]): ImportCandidate[] {
  const known = new Set(existing.map((p) => norm(p.name)));
  const seen = new Set<string>();
  const out: ImportCandidate[] = [];
  for (const r of raws) {
    if (!r.name || !(r.day >= 1 && r.day <= 31) || !(r.month >= 1 && r.month <= 12)) continue;
    const key = `${norm(r.name)}|${r.day}|${r.month}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, ...r, alreadyThere: known.has(norm(r.name)) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function parseText(text: string): Raw[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, ''); // lignes repliées (RFC 5545 / 6350)
  if (/BEGIN:VCARD/i.test(unfolded)) return parseVcf(unfolded);
  if (/BEGIN:VCALENDAR/i.test(unfolded)) return parseIcs(unfolded);
  return [];
}

function parseDate(v: string): { day: number; month: number; year?: number } | null {
  v = v.trim();
  let m = v.match(/^(\d{4}|--)-?(\d{2})-?(\d{2})/); // 1990-05-12, 19900512, --0512, --05-12
  if (m) {
    const year = m[1] === '--' ? undefined : parseInt(m[1], 10);
    return { year: year && year > 1900 && year !== 1604 ? year : undefined, month: parseInt(m[2], 10), day: parseInt(m[3], 10) };
  }
  m = v.match(/^--(\d{2})(\d{2})$/);
  if (m) return { month: parseInt(m[1], 10), day: parseInt(m[2], 10) };
  return null;
}

const unescape = (s: string) => s.replace(/\\,/g, ',').replace(/\;/g, ';').replace(/\\n/gi, ' ').trim();

function parseVcf(text: string): Raw[] {
  const out: Raw[] = [];
  for (const card of text.split(/BEGIN:VCARD/i).slice(1)) {
    const fn = card.match(/^(?:item\d+\.)?FN[^:\n]*:(.*)$/im)?.[1];
    const bday = card.match(/^(?:item\d+\.)?BDAY[^:\n]*:(.*)$/im)?.[1];
    if (!fn || !bday) continue;
    const d = parseDate(bday);
    const tel = card.match(/^(?:item\d+\.)?TEL[^:\n]*:(.*)$/im)?.[1]?.trim();
    if (d) out.push({ name: unescape(fn), ...d, ...(tel ? { phone: tel } : {}) });
  }
  return out;
}

const SUMMARY_PATTERNS = [
  /^anniversaire d[e'’]\s*(.+)$/i,
  /^(.+?)['’]s birthday$/i,
  /^birthday:?\s*(.+)$/i,
  /^(.+?)\s*[-–]\s*anniversaire$/i,
  /^🎂\s*(.+)$/,
];

function parseIcs(text: string): Raw[] {
  const out: Raw[] = [];
  for (const ev of text.split(/BEGIN:VEVENT/i).slice(1)) {
    const summary = ev.match(/^SUMMARY[^:\n]*:(.*)$/im)?.[1];
    const start = ev.match(/^DTSTART[^:\n]*:(.*)$/im)?.[1];
    if (!summary || !start) continue;
    let name = unescape(summary);
    for (const re of SUMMARY_PATTERNS) {
      const m = name.match(re);
      if (m) { name = m[1].trim(); break; }
    }
    const d = parseDate(start);
    // Pour un calendrier d'événements récurrents, l'année de DTSTART n'est pas l'année de naissance.
    if (d) out.push({ name, day: d.day, month: d.month });
  }
  return out;
}
