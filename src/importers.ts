import { Platform } from 'react-native';
import * as Contacts from 'expo-contacts/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { parseText, Raw } from './parsers';
export { toCandidates } from './parsers';

/** Contacts du téléphone qui ont une date d'anniversaire (iOS et Android). */
export async function readPhoneContacts(): Promise<Raw[] | 'refuse' | 'indisponible'> {
  if (Platform.OS === 'web') return 'indisponible';
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') return 'refuse';
  const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.Birthday] });
  return data
    .filter((c) => c.birthday && c.birthday.day && c.birthday.month !== undefined)
    .map((c) => ({
      name: c.name ?? [c.firstName, c.lastName].filter(Boolean).join(' '),
      day: c.birthday!.day,
      month: c.birthday!.month + 1, // l'API renvoie des mois 0-11
      year: c.birthday!.year && c.birthday!.year > 1900 ? c.birthday!.year : undefined,
    }));
}

/** Fichier .vcf (export Google Contacts / iCloud / Outlook) ou .ics (calendrier d'anniversaires). */
export async function pickAndParseFile(): Promise<Raw[] | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['text/vcard', 'text/x-vcard', 'text/calendar', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  const text = Platform.OS === 'web' ? await (await fetch(asset.uri)).text() : await new File(asset.uri).text();
  return parseText(text);
}

