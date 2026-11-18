export type Relation = 'famille' | 'ami' | 'collegue' | 'autre';

export type Person = {
  id: string;
  name: string;
  day: number; // 1-31
  month: number; // 1-12
  year?: number; // facultatif
  relation: Relation;
  emoji: string;
  giftNeeded: boolean; // recevoir les rappels "cadeau" pour cette personne
  giftIdeas?: string;
  notes?: string;
  phone?: string; // pour SMS / WhatsApp
  messenger?: string; // identifiant m.me (facultatif)
  snapchat?: string; // pseudo Snapchat (facultatif)
  preferredChannel?: 'sms' | 'whatsapp' | 'messenger' | 'snapchat' | 'instagram' | 'autre';
  source?: 'manuel' | 'contacts' | 'fichier';
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
  alreadyThere: boolean;
};
