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

/**
 * Nom d'utilisateur Snapchat (pas le nom affiché) : 3 à 15 caractères, commence par une lettre,
 * lettres, chiffres, « - », « _ » ou « . ». Accepte aussi un lien de profil collé.
 * Retourne null si ce n'est pas un nom d'utilisateur valide (ex. « Léa Martin »).
 */
export function snapUsername(input?: string): string | null {
  if (!input) return null;
  let s = input.trim();
  const link = s.match(/snapchat\.com\/(?:add\/|@)([^/?#\s]+)/i);
  if (link) s = link[1];
  s = s.replace(/^@/, '').toLowerCase();
  return /^[a-z][a-z0-9._-]{2,14}$/.test(s) ? s : null;
}

export function snapUrls(handle?: string): string[] {
  const u = snapUsername(handle);
  // Snapchat n'a pas de lien vers une conversation : on ouvre le profil (bouton « Chat »),
  // sinon simplement l'app.
  return u ? [`https://www.snapchat.com/add/${u}`, 'snapchat://'] : ['snapchat://', 'https://www.snapchat.com/'];
}
