// Petits calculs « bonus » : signe astrologique, âge rond, jour de la semaine, libellés selon le type d'événement.
import { nextBirthday } from './dates.ts';
import type { EventKind, Person } from './types';

const SIGNS: [number, number, string, string][] = [
  // [mois, jour de début, nom, emoji] — un signe court du jour de début jusqu'au début du suivant
  [1, 20, 'Verseau', '♒️'], [2, 19, 'Poissons', '♓️'], [3, 21, 'Bélier', '♈️'], [4, 20, 'Taureau', '♉️'],
  [5, 21, 'Gémeaux', '♊️'], [6, 21, 'Cancer', '♋️'], [7, 23, 'Lion', '♌️'], [8, 23, 'Vierge', '♍️'],
  [9, 23, 'Balance', '♎️'], [10, 23, 'Scorpion', '♏️'], [11, 22, 'Sagittaire', '♐️'], [12, 22, 'Capricorne', '♑️'],
];

export function zodiac(day: number, month: number): { name: string; emoji: string } {
  let sign = SIGNS[11]; // Capricorne par défaut (du 22 déc. au 19 janv.)
  for (const s of SIGNS) if (month > s[0] || (month === s[0] && day >= s[1])) sign = s;
  if (month === 1 && day < 20) sign = SIGNS[11];
  return { name: sign[2], emoji: sign[3] };
}

/** Âge « important » : 18, 20, 21, puis toutes les dizaines, et les 25/75. */
export const isMilestone = (age?: number) => !!age && (age === 18 || age === 21 || age === 25 || age === 75 || age % 10 === 0);

export function weekdayLabel(p: Pick<Person, 'day' | 'month'>, from = new Date()): string {
  return nextBirthday(p, from).toLocaleDateString('fr-FR', { weekday: 'long' });
}

export const KIND_META: Record<EventKind, { label: string; emoji: string; of: (name: string) => string; age: (n: number) => string }> = {
  anniversaire: { label: 'Anniversaire', emoji: '🎂', of: (n) => `Anniversaire de ${n}`, age: (n) => `${n} ans` },
  fete: { label: 'Fête', emoji: '🌸', of: (n) => `Fête de ${n}`, age: () => '' },
  couple: { label: 'Couple / mariage', emoji: '💍', of: (n) => `Anniversaire de ${n}`, age: (n) => `${n} an${n > 1 ? 's' : ''} ensemble` },
  autre: { label: 'Autre', emoji: '⭐️', of: (n) => n, age: (n) => `${n} an${n > 1 ? 's' : ''}` },
};

export const kindOf = (p: Person): EventKind => p.kind ?? 'anniversaire';

/** Titre de l'événement, ex. « Anniversaire de Léa », « Fête de Léa », « Mariage de Léa & Tom ». */
export function eventTitle(p: Person): string {
  const k = kindOf(p);
  if (k === 'autre' && p.label) return `${p.label} (${p.name})`;
  return KIND_META[k].of(p.name);
}

/** « 30 ans », « 5 ans ensemble » ou '' si pas d'année / pas d'âge pour ce type. */
export function ageLabel(p: Person, age?: number): string {
  if (!age) return '';
  return KIND_META[kindOf(p)].age(age);
}

export const currentYearKey = (p: Person, from = new Date()) => String(nextBirthday(p, from).getFullYear());

/** Suivi pour l'occurrence à venir (ou d'aujourd'hui). */
export const trackFor = (p: Person, from = new Date()) => p.track?.[currentYearKey(p, from)] ?? {};

export function giftBudget(people: Person[], year: number) {
  let total = 0;
  let count = 0;
  for (const p of people) for (const g of p.gifts ?? []) if (g.year === year) { count++; total += g.price ?? 0; }
  return { total, count };
}

export function perMonth(people: Person[]): number[] {
  const out = Array(12).fill(0);
  people.forEach((p) => { out[p.month - 1]++; });
  return out;
}

import type { GiftIdea } from './types';

/** Idées cadeau (reprend l'ancien champ texte si besoin). */
export const ideasOf = (p: Person): GiftIdea[] => p.ideas ?? (p.giftIdeas ? [{ id: 'legacy', text: p.giftIdeas }] : []);
/** Idées pas encore offertes, en une ligne (notifications, calendrier, accueil). */
export const openIdeasText = (p: Person) => ideasOf(p).filter((i) => !i.done).map((i) => i.text).join(', ');
export const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] ?? name;
