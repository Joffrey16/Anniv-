// Clés VAPID (identité du serveur de notifications), dérivées de la clé du compte de service Firebase :
// un seul secret à configurer dans GitHub, et la clé publique est recalculée au moment de publier le site.
import { createECDH, createHmac } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const N = BigInt('0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551'); // ordre de la courbe P-256

export function vapidKeys(serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT) {
  if (!serviceAccountJson) throw new Error('FIREBASE_SERVICE_ACCOUNT manquant');
  const { private_key: secret } = JSON.parse(serviceAccountJson);
  if (!secret) throw new Error('Clé privée absente du compte de service');
  for (let i = 0; ; i++) {
    const d = createHmac('sha256', secret).update(`anniv-vapid-v1:${i}`).digest();
    const n = BigInt(`0x${d.toString('hex')}`);
    if (n === 0n || n >= N) continue;
    const ecdh = createECDH('prime256v1');
    ecdh.setPrivateKey(d);
    return { publicKey: ecdh.getPublicKey().toString('base64url'), privateKey: d.toString('base64url') };
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href && process.argv[2] === 'public') {
  console.log(vapidKeys().publicKey);
}
