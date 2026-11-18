// Bibliothèque de messages. {prenom} et {age} sont remplacés automatiquement.
import type { EventKind } from './types';

export type Tone = 'tendre' | 'drole' | 'classique' | 'pro';
export const TONES: { id: Tone; label: string }[] = [
  { id: 'tendre', label: '🥰 Tendre' },
  { id: 'drole', label: '😂 Drôle' },
  { id: 'classique', label: '🎉 Classique' },
  { id: 'pro', label: '💼 Collègue' },
];

const BIRTHDAY: Record<Tone, string[]> = {
  tendre: [
    "Joyeux anniversaire {prenom} ❤️ Merci d'être toi, tout simplement. Je te souhaite une journée aussi belle que toi !",
    "Bon anniversaire {prenom} 🥰 J'ai beaucoup de chance de t'avoir dans ma vie. Profite de chaque instant aujourd'hui !",
    "Joyeux anniversaire {prenom} 💕 Que cette nouvelle année t'apporte tout le bonheur que tu mérites (et c'est beaucoup) !",
    "Un très joyeux anniversaire {prenom} 🌷 Je pense fort à toi aujourd'hui. Plein de bisous !",
  ],
  drole: [
    "Joyeux anniversaire {prenom} ! 🎂 Rassure-toi, tu ne vieillis pas : tu prends juste de la valeur, comme un bon vin 🍷",
    "Bon anniversaire {prenom} ! 🥳 Encore une bougie de plus… pense à prévenir les pompiers 🚒🔥",
    "Joyeux anniversaire {prenom} ! 😎 À ton âge, on ne compte plus les années, on compte les siestes. Profites-en !",
    "Bon anniv {prenom} ! 🎈 Les statistiques le prouvent : ceux qui fêtent le plus d'anniversaires vivent le plus longtemps 😉",
    "Joyeux anniversaire {prenom} ! 🎁 J'avais prévu un cadeau énorme… et puis j'ai pensé que ma présence suffisait 😇",
  ],
  classique: [
    "Joyeux anniversaire {prenom} ! 🎂🎉 Passe une super journée, plein de bonheur et de belles surprises 🥳",
    "Bon anniversaire {prenom} ! 🎈 Je te souhaite une excellente journée et une année pleine de réussites.",
    "Joyeux anniversaire {prenom} ! 🥂 Profite bien de ta journée et de ceux que tu aimes.",
    "Happy birthday {prenom} ! 🎉 Que tous tes vœux se réalisent cette année ✨",
  ],
  pro: [
    "Joyeux anniversaire {prenom} ! Je vous souhaite une excellente journée 🎉",
    "Bon anniversaire {prenom} ! Belle journée à toi, et à très vite au bureau 🎂",
    "Joyeux anniversaire {prenom} ! Toute l'équipe te souhaite une très belle journée 🥳",
  ],
};

const FETE = [
  'Bonne fête {prenom} ! 🌸 Je te souhaite une très belle journée.',
  "C'est ta fête aujourd'hui {prenom} ! 🎉 Profite bien !",
  'Bonne fête {prenom} ! 💐 Plein de bonnes choses pour toi aujourd\'hui.',
];

const COUPLE = [
  'Joyeux anniversaire à vous deux ! 💍 {age} ans de bonheur, et ce n\'est que le début ❤️',
  'Bon anniversaire de couple {prenom} ! 🥂 Je vous souhaite encore plein de belles années ensemble.',
  'Félicitations pour votre anniversaire {prenom} ! 💕 Vous êtes un exemple !',
];

export function wishesFor(kind: EventKind, tone: Tone): string[] {
  if (kind === 'fete') return FETE;
  if (kind === 'couple') return COUPLE;
  return BIRTHDAY[tone];
}

export function randomWish(kind: EventKind, tone: Tone, avoid?: string): string {
  const list = wishesFor(kind, tone);
  const pool = list.length > 1 ? list.filter((m) => m !== avoid) : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const defaultToneFor = (relation: string): Tone => (relation === 'collegue' ? 'pro' : relation === 'famille' ? 'tendre' : 'classique');
