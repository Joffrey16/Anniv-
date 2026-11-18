// Partie « pure » (testable) : texte du message et liens d'ouverture des apps.
import type { Person } from './types';

export const DEFAULT_WISH_TEMPLATE = 'Joyeux anniversaire {prenom} ! 🎂🎉 Je te souhaite une super journée, plein de bonheur et de belles surprises 🥳';

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function buildMessage(template: string, p: Person, age?: number): string {
  return template
    .replace(/\{prenom\}/gi, firstName(p.name))
    .replace(/\{nom\}/gi, p.name.trim())
    .replace(/\{age\}/gi, age ? String(age) : '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Numéro au format international sans « + » (pour WhatsApp). Les numéros en 0X sont considérés français. */
export function internationalDigits(phone: string, defaultCountry = '33'): string | null {
  let s = phone.replace(/[^\d+]/g, '');
  if (!s) return null;
  if (s.startsWith('+')) s = s.slice(1);
  else if (s.startsWith('00')) s = s.slice(2);
  else if (s.startsWith('0')) s = defaultCountry + s.slice(1);
  return s.length >= 8 ? s : null;
}

export function smsUrl(phone: string | undefined, text: string, platform: 'ios' | 'android' | string): string {
  const num = phone ? phone.replace(/[^\d+]/g, '') : '';
  // iOS attend « &body= », Android « ?body= ».
  return `sms:${num}${platform === 'ios' ? '&' : '?'}body=${encodeURIComponent(text)}`;
}

export function whatsappUrl(phone: string | undefined, text: string): string {
  const num = phone ? internationalDigits(phone) : null;
  return num ? `https://wa.me/${num}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
}
