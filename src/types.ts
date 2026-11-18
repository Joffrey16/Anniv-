export type Relation = 'famille' | 'ami' | 'collegue' | 'autre';

export type EventKind = 'anniversaire' | 'fete' | 'couple' | 'autre';

export type GiftIdea = { id: string; text: string; done?: boolean };
export type GiftGiven = { id: string; year: number; text: string; price?: number };
/** Suivi d'une année donnée (clé = année, ex. "2026"). */
export type YearTrack = { wished?: boolean; bought?: boolean };

export type Person = {
  id: string;
  name: string;
  kind?: EventKind; // défaut : anniversaire
  label?: string; // pour « autre » : nom de l'événement
  day: number; // 1-31
  month: number; // 1-12
  year?: number; // facultatif
  relation: Relation;
  emoji: string;
  giftNeeded: boolean; // recevoir les rappels "cadeau" pour cette personne
  giftIdeas?: string; // ancien champ texte (repris comme première idée)
  ideas?: GiftIdea[];
  gifts?: GiftGiven[];
  track?: Record<string, YearTrack>;
  notes?: string;
  phone?: string; // pour SMS / WhatsApp
  messenger?: string; // identifiant m.me (facultatif)
  snapchat?: string; // pseudo Snapchat (facultatif)
  preferredChannel?: 'sms' | 'whatsapp' | 'messenger' | 'snapchat' | 'instagram' | 'autre';
  source?: 'manuel' | 'contacts' | 'fichier' | 'partage';
};

export type ReminderKind = 'cadeau' | 'souhaiter';

export type ReminderRule = {
  id: string;
  kind: ReminderKind;
  daysBefore: number; // 0 = le jour même
  hour: number;
  minute: number;
  enabled: boolean;
};

export type Settings = {
  reminders: ReminderRule[];
  wishTemplate: string; // {prenom}, {nom}, {age}
};

export type ImportCandidate = {
  key: string;
  name: string;
  day: number;
  month: number;
  year?: number;
  phone?: string;
  relation?: Relation;
  emoji?: string;
  alreadyThere: boolean;
};
