import type { Person } from './types';

export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export const daysInMonth = (month: number, year = 2024) => new Date(year, month, 0).getDate();

/** Date (à minuit) du prochain anniversaire, aujourd'hui inclus. 29 février -> 28 février les années non bissextiles. */
export function nextBirthday(p: Pick<Person, 'day' | 'month'>, from = new Date()): Date {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const make = (y: number) => {
    const d = p.month === 2 && p.day === 29 && !isLeap(y) ? 28 : p.day;
    return new Date(y, p.month - 1, d);
  };
  let candidate = make(today.getFullYear());
  if (candidate < today) candidate = make(today.getFullYear() + 1);
  return candidate;
}

export function daysUntil(p: Pick<Person, 'day' | 'month'>, from = new Date()): number {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((nextBirthday(p, from).getTime() - today.getTime()) / 86400000);
}

/** Âge que la personne aura à son prochain anniversaire. */
export function upcomingAge(p: Person, from = new Date()): number | undefined {
  if (!p.year) return undefined;
  return nextBirthday(p, from).getFullYear() - p.year;
}

export function countdownLabel(days: number): string {
  if (days === 0) return "Aujourd'hui !";
  if (days === 1) return 'Demain';
  if (days < 7) return `Dans ${days} jours`;
  if (days < 14) return 'Dans 1 semaine';
  if (days < 31) return `Dans ${Math.floor(days / 7)} semaines`;
  return `Dans ${days} jours`;
}

export const formatDayMonth = (day: number, month: number) => `${day === 1 ? '1er' : day} ${MONTHS[month - 1]}`;

export function sortByUpcoming(people: Person[], from = new Date()): Person[] {
  return [...people].sort((a, b) => daysUntil(a, from) - daysUntil(b, from) || a.name.localeCompare(b.name));
}
