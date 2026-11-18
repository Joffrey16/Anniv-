// Serveur de rappels : lancé toutes les 15 minutes par GitHub Actions (.github/workflows/rappels.yml).
// Il lit, pour chaque compte qui a activé les notifications, le planning calculé par l'app (pushPlan)
// et envoie les rappels arrivés à échéance à chaque appareil abonné (pushDevices).
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import * as webpush from 'web-push';
import { parseServiceAccount, vapidKeys } from './vapid.mjs';

const SITE = process.env.SITE_URL || 'https://joffrey16.github.io/Anniv-/';
const MAX_LATE = 6 * 3600e3; // un rappel en retard de plus de 6 h n'est plus envoyé
const PUSH_HOSTS = /(^|\.)(push\.apple\.com|googleapis\.com|mozilla\.com|mozaws\.net|notify\.windows\.com)$/;

const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
const sa = parseServiceAccount(saJson);
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();
const { publicKey, privateKey } = vapidKeys(saJson);
webpush.setVapidDetails(SITE, publicKey, privateKey);

const allowed = (endpoint) => {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && (process.env.PUSH_ALLOW_ANY_HOST === '1' || PUSH_HOSTS.test(u.hostname));
  } catch { return false; }
};

const now = Date.now();
const users = await db.collection('users').where('pushEnabled', '==', true).get();
let sent = 0;
let failed = 0;
let removed = 0;

for (const doc of users.docs) {
  const u = doc.data();
  const since = Math.max(u.pushSentUntil ?? 0, now - MAX_LATE);
  const msgs = (u.pushPlan ?? [])
    .filter((r) => r.at > since && r.at <= now)
    .map((r) => ({ title: r.title, body: r.body, tag: r.id, url: `#${r.kind === 'souhaiter' ? 'souhaiter' : 'fiche'}=${encodeURIComponent(r.personId)}` }));
  const wantsTest = typeof u.pushTest === 'number' && u.pushTest > (u.pushTestSent ?? 0) && now - u.pushTest < 24 * 3600e3;
  if (wantsTest) msgs.push({ title: '🚀 Rappels Anniv ! prêts', body: 'Cette notification vient du serveur de rappels : tout fonctionne !', tag: 'test' });
  if (!msgs.length) continue;

  const devices = Object.entries(u.pushDevices ?? {});
  const dead = new Set();
  for (const [id, dev] of devices) {
    if (!dev?.sub?.endpoint || !allowed(dev.sub.endpoint)) { dead.add(id); continue; }
    for (const m of msgs) {
      try {
        await webpush.sendNotification(dev.sub, JSON.stringify(m), { TTL: 12 * 3600, urgency: 'high' });
        sent++;
      } catch (e) {
        // 404/410 : l'abonnement n'existe plus (app supprimée, notifications coupées).
        if (e.statusCode === 404 || e.statusCode === 410) { dead.add(id); break; }
        failed++;
        console.warn(`Échec d'envoi (${e.statusCode ?? 'réseau'}) : ${e.body || e.message}`);
      }
    }
  }
  const update = { pushSentUntil: now };
  if (wantsTest) update.pushTestSent = u.pushTest;
  for (const id of dead) update[`pushDevices.${id}`] = FieldValue.delete();
  if (dead.size && dead.size === devices.length) update.pushEnabled = false;
  removed += dead.size;
  await doc.ref.update(update);
}

console.log(`${users.size} compte(s) avec notifications, ${sent} envoyée(s), ${failed} échec(s), ${removed} appareil(s) retiré(s).`);
