import AsyncStorage from '@react-native-async-storage/async-storage';
import { Person, Settings } from './types';
import { DEFAULT_WISH_TEMPLATE } from './message';

const PEOPLE_KEY = 'anniv.people.v1';
const SETTINGS_KEY = 'anniv.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  reminders: [
    { id: 'gift-7', kind: 'cadeau', daysBefore: 7, hour: 18, minute: 0, enabled: true },
    { id: 'wish-1', kind: 'souhaiter', daysBefore: 1, hour: 20, minute: 0, enabled: false },
    { id: 'wish-0', kind: 'souhaiter', daysBefore: 0, hour: 9, minute: 0, enabled: true },
  ],
  wishTemplate: DEFAULT_WISH_TEMPLATE,
};

export async function loadPeople(): Promise<Person[]> {
  try {
    const raw = await AsyncStorage.getItem(PEOPLE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const savePeople = (people: Person[]) => AsyncStorage.setItem(PEOPLE_KEY, JSON.stringify(people));

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const saveSettings = (s: Settings) => AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
