// Sauvegarde en ligne (Firebase) : compte e-mail + mot de passe, anniversaires dans users/{uid}/people.
import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import {
  Auth, connectAuthEmulator, createUserWithEmailAndPassword, EmailAuthProvider, GoogleAuthProvider, linkWithCredential, onAuthStateChanged, sendPasswordResetEmail,
  signInWithCredential, signInWithEmailAndPassword, signInWithPopup, signOut, User,
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

/** Le compte a-t-il un mot de passe (sinon : créé avec Google uniquement) ? */
export const hasPassword = (u: User | null | undefined) => Boolean(u?.providerData.some((p) => p.providerId === 'password'));

/** Ajoute un mot de passe à un compte Google : même compte, utilisable dans l'app installée sur iPhone. */
export async function addPassword(password: string) {
  const u = auth?.currentUser;
  if (!u?.email) throw new Error('cloud-off');
  await linkWithCredential(u, EmailAuthProvider.credential(u.email, password));
}

// Connexion Google par redirection, sans passer par la fenêtre de Firebase (qui perd sa session
// dans l'app installée sur iPhone) : on part chez Google, qui revient sur l'app avec un jeton (#id_token=…).
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const GOOGLE_KEY = 'anniv.google';
export const googleRedirectAvailable = Platform.OS === 'web' && GOOGLE_CLIENT_ID.length > 0;

const randomHex = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

export function startGoogleRedirect() {
  const state = randomHex();
  const nonce = randomHex();
  localStorage.setItem(GOOGLE_KEY, JSON.stringify({ state, nonce }));
  const q = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: window.location.origin + window.location.pathname,
    response_type: 'id_token',
    scope: 'openid email profile',
    prompt: 'select_account',
    state,
    nonce,
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
}

const authError = (code: string) => Object.assign(new Error(code), { code });

/** Au retour de Google : connecte le compte Firebase avec le jeton reçu. Renvoie false s'il n'y a rien à faire. */
export async function completeGoogleRedirect(): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !auth) return false;
  const h = new URLSearchParams(window.location.hash.slice(1));
  if (!h.has('id_token') && !h.has('error')) return false;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  let saved: { state?: string; nonce?: string } | null = null;
  try { saved = JSON.parse(localStorage.getItem(GOOGLE_KEY) ?? 'null'); } catch { saved = null; }
  localStorage.removeItem(GOOGLE_KEY);
  if (h.has('error')) throw authError(h.get('error') === 'access_denied' ? 'auth/popup-closed-by-user' : 'auth/internal-error');
  if (!saved || saved.state !== h.get('state')) throw authError('auth/google-state');
  const idToken = h.get('id_token')!;
  const part = idToken.split('.')[1] ?? '';
  const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (part.length % 4)) % 4)));
  if (payload.nonce !== saved.nonce) throw authError('auth/google-state');
  await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  return true;
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
    'auth/requires-recent-login': 'Par sécurité, déconnecte-toi, reconnecte-toi avec Google, puis réessaie.',
    'auth/provider-already-linked': 'Ce compte a déjà un mot de passe.',
    'auth/credential-already-in-use': 'Cet e-mail est déjà utilisé par un autre compte.',
    'auth/google-state': 'La connexion Google a expiré. Réessaie.',
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
