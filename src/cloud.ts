// Sauvegarde en ligne (Firebase) : compte e-mail + mot de passe, anniversaires dans users/{uid}/people.
import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import {
  Auth, connectAuthEmulator, createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signInWithPopup, signOut, User,
} from 'firebase/auth';
import {
  collection, connectFirestoreEmulator, deleteDoc, deleteField, doc, Firestore, getDoc, initializeFirestore, memoryLocalCache,
  onSnapshot, persistentLocalCache, setDoc, writeBatch,
} from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';
import { createAuth } from './firebaseAuth';
import type { Person, Settings } from './types';
import type { PlannedReminder } from './reminderPlan';

const emulator = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR; // ex. "127.0.0.1" pour les tests
const config = emulator ? { apiKey: 'demo', projectId: 'demo-anniv', authDomain: 'demo-anniv.firebaseapp.com', appId: 'demo' } : firebaseConfig;

export const cloudEnabled = Boolean(config);

let auth: Auth | null = null;
let db: Firestore | null = null;

if (config) {
  const app = initializeApp(config);
  auth = createAuth(app);
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: Platform.OS === 'web' ? persistentLocalCache() : memoryLocalCache(),
  });
  if (emulator) {
    connectAuthEmulator(auth, `http://${emulator}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulator, 8080);
  }
}

export const onUser = (cb: (u: User | null) => void) => (auth ? onAuthStateChanged(auth, cb) : (cb(null), () => undefined));

export async function signIn(email: string, password: string, create: boolean) {
  if (!auth) throw new Error('cloud-off');
  return create ? createUserWithEmailAndPassword(auth, email.trim(), password) : signInWithEmailAndPassword(auth, email.trim(), password);
}

/** Connexion Google (version web) : fenêtre Google, puis retour dans l'app. */
export async function signInWithGoogle() {
  if (!auth) throw new Error('cloud-off');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

export const resetPassword = (email: string) => (auth ? sendPasswordResetEmail(auth, email.trim()) : Promise.reject(new Error('cloud-off')));
export const logOut = () => (auth ? signOut(auth) : Promise.resolve());

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-email': "Cette adresse e-mail n'est pas valide.",
    'auth/missing-email': 'Indique ton adresse e-mail.',
    'auth/missing-password': 'Indique ton mot de passe.',
    'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
    'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.',
    'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
    'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
    'auth/user-not-found': 'Aucun compte avec cet e-mail.',
    'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
    'auth/network-request-failed': 'Pas de connexion internet.',
    'auth/operation-not-allowed': "Ce mode de connexion n'est pas encore activé. Utilise l'autre en attendant.",
    'auth/popup-blocked': 'La fenêtre Google a été bloquée. Réessaie, ou connecte-toi avec ton e-mail.',
    'auth/unauthorized-domain': "La connexion Google n'est pas encore autorisée pour ce site.",
    'auth/account-exists-with-different-credential': 'Un compte existe déjà avec cet e-mail : connecte-toi avec ton mot de passe.',
    'auth/internal-error': "La connexion Google n'a pas pu s'ouvrir. Réessaie, ou connecte-toi avec ton e-mail.",
    'auth/cancelled-popup-request': '',
    'auth/popup-closed-by-user': '',
  };
  if (!(code in map)) console.warn('[auth]', e);
  return map[code] ?? 'Une erreur est survenue. Réessaie.';
}

const peopleCol = (uid: string) => collection(db!, 'users', uid, 'people');
const userDoc = (uid: string) => doc(db!, 'users', uid);

export const fetchSettings = async (uid: string) => ((await getDoc(userDoc(uid))).data()?.settings as Settings | undefined) ?? null;

/** fromCache = données locales pas encore confirmées par le serveur. */
export function subscribePeople(uid: string, cb: (p: Person[], fromCache: boolean) => void) {
  return onSnapshot(peopleCol(uid), { includeMetadataChanges: true }, (snap) => cb(snap.docs.map((d) => d.data() as Person), snap.metadata.fromCache));
}

export function subscribeSettings(uid: string, cb: (s: Settings) => void) {
  return onSnapshot(userDoc(uid), (snap) => { const v = snap.data()?.settings; if (v) cb(v as Settings); });
}

export async function uploadPeople(uid: string, people: Person[]) {
  for (let i = 0; i < people.length; i += 400) {
    const batch = writeBatch(db!);
    people.slice(i, i + 400).forEach((p) => batch.set(doc(peopleCol(uid), p.id), p));
    await batch.commit();
  }
}

export const putPerson = (uid: string, p: Person) => setDoc(doc(peopleCol(uid), p.id), p);
export const removePerson = (uid: string, id: string) => deleteDoc(doc(peopleCol(uid), id));
export const putSettings = (uid: string, s: Settings) => setDoc(userDoc(uid), { settings: s }, { merge: true });

// Notifications push : abonnements des appareils + planning des rappels, lus par le serveur de rappels.
export const putPushDevice = (uid: string, id: string, d: { sub: unknown; ua: string; at: number }) =>
  setDoc(userDoc(uid), { pushEnabled: true, pushDevices: { [id]: d } }, { merge: true });

export async function removePushDevice(uid: string, id: string) {
  const devices = { ...((await getDoc(userDoc(uid))).data()?.pushDevices ?? {}) } as Record<string, unknown>;
  delete devices[id];
  await setDoc(userDoc(uid), { pushDevices: { [id]: deleteField() }, pushEnabled: Object.keys(devices).length > 0 }, { merge: true });
}

export const requestPushTest = (uid: string) => setDoc(userDoc(uid), { pushTest: Date.now() }, { merge: true });

export const putPushPlan = (uid: string, plan: PlannedReminder[]) =>
  setDoc(userDoc(uid), { pushPlan: plan, pushPlanAt: Date.now() }, { merge: true });
