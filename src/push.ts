// Notifications « push » sur la version web installée (iPhone 16.4+, Android, ordinateur).
// Le téléphone s'abonne auprès de son service de notifications (Apple, Google, Mozilla…) avec notre clé publique,
// l'abonnement est rangé dans le compte, et le serveur de rappels (GitHub Actions) envoie les alertes à l'heure prévue.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { putPushDevice, removePushDevice, requestPushTest } from './cloud';
import { isIOS, isStandaloneWeb } from './platform';

export const VAPID_KEY = process.env.EXPO_PUBLIC_VAPID_KEY ?? '';
/** La fonction est disponible sur ce site (clé configurée au moment de la publication). */
export const pushConfigured = Platform.OS === 'web' && VAPID_KEY.length > 0;

export type PushStatus = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

const DEVICE_KEY = 'anniv.device';
const SENT_KEY = 'anniv.pushsent';

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(b64: string) {
  const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

function sameKey(sub: PushSubscription) {
  const k = sub.options?.applicationServerKey;
  if (!k) return true; // navigateur qui ne l'expose pas
  const a = new Uint8Array(k);
  const b = keyBytes(VAPID_KEY);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

async function deviceId() {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.ready;
}

export async function pushStatus(): Promise<PushStatus> {
  if (!pushConfigured) return 'unsupported';
  if (!supported()) return isIOS && !isStandaloneWeb ? 'needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  const sub = await (await registration())?.pushManager.getSubscription();
  return sub && sameKey(sub) ? 'on' : 'off'; // clé changée : il faut réactiver
}

async function save(uid: string, sub: PushSubscription) {
  const json = JSON.stringify(sub.toJSON());
  await putPushDevice(uid, await deviceId(), { sub: sub.toJSON(), ua: navigator.userAgent.slice(0, 200), at: Date.now() });
  await AsyncStorage.setItem(SENT_KEY, `${uid}|${json}`);
}

/** À appeler directement dans l'appui sur le bouton (Safari exige un geste de l'utilisateur). */
export async function enablePush(uid: string): Promise<PushStatus> {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub)) { await sub.unsubscribe(); sub = null; }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_KEY) });
  await save(uid, sub);
  return 'on';
}

export async function disablePush(uid: string) {
  if (!supported()) return;
  const sub = await (await registration())?.pushManager.getSubscription();
  await sub?.unsubscribe().catch(() => undefined);
  await removePushDevice(uid, await deviceId());
  await AsyncStorage.removeItem(SENT_KEY);
}

/** À l'ouverture : renvoie l'abonnement s'il a changé (le navigateur peut le renouveler) ou si le compte a changé. */
export async function refreshPush(uid: string) {
  if (!pushConfigured || !supported() || Notification.permission !== 'granted') return;
  const sub = await (await registration())?.pushManager.getSubscription();
  if (!sub) return;
  if (!sameKey(sub)) return; // ancienne clé : l'utilisateur devra réactiver
  const prev = await AsyncStorage.getItem(SENT_KEY);
  if (prev === `${uid}|${JSON.stringify(sub.toJSON())}`) return;
  await save(uid, sub);
}

/** Notification immédiate (affichage) + demande d'un vrai envoi par le serveur au prochain passage. */
export async function testPush(uid: string) {
  const reg = await registration();
  await reg?.showNotification('🎂 Test Anniv !', { body: "L'affichage des notifications fonctionne sur cet appareil 🎉", icon: undefined });
  await requestPushTest(uid);
}
