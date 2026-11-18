// Affiche l'ID client OAuth « Web » utilisé par la connexion Google de Firebase (valeur publique),
// lu avec le compte de service. Sert à la connexion Google dans l'app installée sur iPhone.
// N'affiche jamais le secret du client.
import { createSign } from 'node:crypto';
import { parseServiceAccount } from './vapid.mjs';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

const sa = parseServiceAccount();
const now = Math.floor(Date.now() / 1000);
const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
  iss: sa.client_email, aud: tokenUri, iat: now, exp: now + 600,
  scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase',
})}`;
const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');

const tok = await fetch(tokenUri, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
}).then((r) => r.json());
if (!tok.access_token) { console.error(`Jeton refusé : ${tok.error ?? 'inconnu'}`); process.exit(1); }

const res = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${sa.project_id}/defaultSupportedIdpConfigs/google.com`, {
  headers: { Authorization: `Bearer ${tok.access_token}` },
});
const cfg = await res.json();
if (!res.ok || !cfg.clientId) { console.error(`Configuration Google illisible (${res.status} ${cfg.error?.status ?? ''})`); process.exit(1); }
console.log(cfg.clientId);
