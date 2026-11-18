// Partage d'anniversaires par lien, sans serveur : la liste est encodée dans la partie « # » de l'adresse,
// qui n'est jamais envoyée au site (elle reste entre les deux téléphones).
import type { Person, Relation } from './types';

export const WEB_APP_URL = 'https://joffrey16.github.io/Anniv-/';
const REL: Relation[] = ['famille', 'ami', 'collegue', 'autre'];

export type SharedPerson = { name: string; day: number; month: number; year?: number; relation: Relation; emoji: string; phone?: string };

function toB64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeShare(people: Person[], from?: string): string {
  // Format compact : [nom, jour, mois, année|0, relation, emoji, téléphone?]
  const rows = people.map((p) => {
    const r: (string | number)[] = [p.name, p.day, p.month, p.year ?? 0, REL.indexOf(p.relation), p.emoji];
    if (p.phone) r.push(p.phone);
    return r;
  });
  return toB64Url(JSON.stringify({ v: 1, f: from || undefined, p: rows }));
}

export function decodeShare(code: string): { from?: string; people: SharedPerson[] } | null {
  try {
    const data = JSON.parse(fromB64Url(code));
    if (data?.v !== 1 || !Array.isArray(data.p)) return null;
    const people = (data.p as unknown[][]).flatMap((r): SharedPerson[] => {
      const [name, day, month, year, rel, emoji, phone] = r as [string, number, number, number, number, string, string?];
      if (typeof name !== 'string' || !(day >= 1 && day <= 31) || !(month >= 1 && month <= 12)) return [];
      return [{ name: name.slice(0, 80), day, month, year: year > 1900 ? year : undefined, relation: REL[rel] ?? 'ami', emoji: typeof emoji === 'string' ? emoji.slice(0, 8) : '🎂', phone: typeof phone === 'string' ? phone.slice(0, 30) : undefined }];
    });
    return { from: typeof data.f === 'string' ? data.f.slice(0, 40) : undefined, people };
  } catch {
    return null;
  }
}

export const buildShareLink = (people: Person[], appUrl: string, from?: string) => `${appUrl.split('#')[0]}#partage=${encodeShare(people, from)}`;

export function shareCodeFromUrl(href: string): string | null {
  const m = href.match(/#partage=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
