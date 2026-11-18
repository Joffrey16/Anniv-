// Synchronisation entre l'état de l'app et Firebase.
// Principe : on garde une « photo » de ce qui est en ligne ; à chaque changement local, on n'envoie que la différence.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { cloudEnabled, fetchSettings, logOut, onUser, putPerson, putPushPlan, putSettings, removePerson, subscribePeople, subscribeSettings, uploadPeople } from './cloud';
import { DEFAULT_SETTINGS } from './storage';
import { planReminders } from './reminderPlan';
import type { Person, Settings } from './types';

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).filter((k) => (v as Record<string, unknown>)[k] !== undefined).sort()
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}
const mapOf = (people: Person[]) => new Map(people.map((p) => [p.id, stable(p)]));
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const dupKey = (p: Person) => `${norm(p.name)}|${p.day}|${p.month}`;
const warn = (e: unknown) => console.warn('[cloud]', e);

type Args = {
  loaded: boolean;
  people: Person[];
  settings: Settings;
  setPeople: (p: Person[]) => void;
  setSettings: (s: Settings) => void;
};

export function useCloudSync({ loaded, people, settings, setPeople, setSettings }: Args) {
  const [user, setUser] = useState<User | null | undefined>(cloudEnabled ? undefined : null);
  const [ready, setReady] = useState(false); // première synchro faite
  const synced = useRef<{ people: Map<string, string>; settings: string } | null>(null);
  const latest = useRef({ people, settings });
  latest.current = { people, settings };

  useEffect(() => onUser(setUser), []);

  useEffect(() => {
    if (!user || !loaded) return;
    const uid = user.uid;
    let first = true;
    let unsubSettings = () => {};
    const unsubPeople = subscribePeople(uid, (cloudPeople, fromCache) => {
      if (first) {
        if (fromCache) return; // on attend la réponse du serveur avant de fusionner
        first = false;
        (async () => {
          // Fusion : ce qui n'était que sur ce téléphone est ajouté au compte (sans doublon).
          const ids = new Set(cloudPeople.map((p) => p.id));
          const keys = new Set(cloudPeople.map(dupKey));
          const toUpload = latest.current.people.filter((p) => !ids.has(p.id) && !keys.has(dupKey(p)));
          if (toUpload.length) await uploadPeople(uid, toUpload);
          const cloudSettings = await fetchSettings(uid);
          const s = cloudSettings ? { ...DEFAULT_SETTINGS, ...cloudSettings } : latest.current.settings;
          if (!cloudSettings) await putSettings(uid, s);
          const merged = [...cloudPeople, ...toUpload];
          synced.current = { people: mapOf(merged), settings: stable(s) };
          setPeople(merged);
          setSettings(s);
          setReady(true);
          unsubSettings = subscribeSettings(uid, (cs) => {
            const full = { ...DEFAULT_SETTINGS, ...cs };
            if (synced.current?.settings === stable(full)) return; // autre champ du compte modifié (ex. notifications)
            if (synced.current) synced.current.settings = stable(full);
            setSettings(full);
          });
        })().catch(warn);
        return;
      }
      if (!synced.current) return;
      synced.current.people = mapOf(cloudPeople);
      setPeople(cloudPeople);
    });
    return () => { unsubPeople(); unsubSettings(); synced.current = null; setReady(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, loaded]);

  // Envoi des changements locaux.
  useEffect(() => {
    const s = synced.current;
    if (!user || !s) return;
    const now = mapOf(people);
    for (const p of people) if (s.people.get(p.id) !== now.get(p.id)) putPerson(user.uid, p).catch(warn);
    for (const id of s.people.keys()) if (!now.has(id)) removePerson(user.uid, id).catch(warn);
    s.people = now;
    const sj = stable(settings);
    if (sj !== s.settings) { s.settings = sj; putSettings(user.uid, settings).catch(warn); }
  }, [people, settings, user]);

  // Planning des rappels pour le serveur de notifications (mis à jour quand la liste ou les réglages changent).
  const lastPlan = useRef('');
  useEffect(() => { lastPlan.current = ''; }, [user?.uid]);
  useEffect(() => {
    if (!user || !ready) return;
    const t = setTimeout(() => {
      const plan = planReminders(people, settings, new Date(), { max: 300, perRule: 2 });
      const json = JSON.stringify(plan);
      if (json === lastPlan.current) return;
      lastPlan.current = json;
      putPushPlan(user.uid, plan).catch(warn);
    }, 2000);
    return () => clearTimeout(t);
  }, [people, settings, user, ready]);

  /** Déconnexion : on coupe la synchro AVANT de vider l'écran, pour ne rien effacer en ligne. */
  const logout = useCallback(async () => {
    synced.current = null;
    await logOut();
  }, []);

  return { user, ready, logout };
}
