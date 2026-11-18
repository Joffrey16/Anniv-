// Clés VAPID (identité du serveur de notifications), dérivées de la clé du compte de service Firebase :
// un seul secret à configurer dans GitHub, et la clé publique est recalculée au moment de publier le site.
import { createECDH, createHmac } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const N = BigInt('0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551'); // ordre de la courbe P-256

/** Fin du premier objet JSON complet (en ignorant les accolades dans les chaînes), ou -1. */
function firstObjectEnd(s) {
  let depth = 0;
  let inStr = false;
  for (let i = s.indexOf('{'); i >= 0 && i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}

/**
 * Lit le secret (contenu du fichier .json du compte de service), en tolérant les petits accidents
 * de copier-coller : espaces spéciaux, accolade finale oubliée, texte en trop après l'objet.
 */
export function parseServiceAccount(raw = process.env.FIREBASE_SERVICE_ACCOUNT) {
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT manquant');
  const s = raw.replace(/[\u00A0\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]/g, ' ').trim();
  const attempts = [s, `${s}\n}`, `${s}"\n}`];
  const end = firstObjectEnd(s);
  if (end > 0) attempts.push(s.slice(s.indexOf('{'), end + 1));
  let firstError;
  for (const a of attempts) {
    try {
      const sa = JSON.parse(a);
      if (!sa.private_key?.includes('PRIVATE KEY') || !sa.client_email || !sa.project_id) {
        throw new Error('il manque private_key, client_email ou project_id : as-tu collé tout le fichier ?');
      }
      return sa;
    } catch (e) { firstError ??= e; }
  }
  // Diagnostic sans rien afficher du secret : longueur, nombre de lignes, caractère fautif.
  const m = /position (\d+)/.exec(firstError.message);
  const pos = m ? Number(m[1]) : -1;
  const at = pos < 0 ? '?' : pos >= s.length ? 'fin du texte' : `U+${s.charCodeAt(pos).toString(16).toUpperCase().padStart(4, '0')}`;
  throw new Error(`Secret FIREBASE_SERVICE_ACCOUNT illisible (${s.length} caractères, ${s.split('\n').length} lignes, problème : ${at}) : ${firstError.message.replace(/ in JSON.*/, '').replace(/"[^]*"/g, '…')}`);
}

export function vapidKeys(serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT) {
  const { private_key: secret } = parseServiceAccount(serviceAccountJson);
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
