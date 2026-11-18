// Construit la version web installable (PWA) dans dist/.
// Usage : EXPO_BASE_URL=/anniv node scripts/build-web.mjs   (base vide pour un domaine racine)
import { execSync } from 'node:child_process';
import { copyFileSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const base = (process.env.EXPO_BASE_URL || '').replace(/\/$/, '');
execSync('npx expo export --platform web --clear', { stdio: 'inherit', env: { ...process.env, CI: '1' } });

const dist = 'dist';
for (const f of readdirSync('web-pwa')) if (f !== 'icon-1024.png') copyFileSync(join('web-pwa', f), join(dist, f));

writeFileSync(join(dist, 'manifest.webmanifest'), JSON.stringify({
  name: 'Anniv !',
  short_name: 'Anniv !',
  description: "Ne plus jamais oublier un anniversaire",
  lang: 'fr',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  background_color: '#FFF8F2',
  theme_color: '#FF6B6B',
  icons: [
    { src: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png' },
    { src: `${base}/icon-512.png`, sizes: '512x512', type: 'image/png' },
    { src: `${base}/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2));

// Service worker : met tous les fichiers en cache pour un fonctionnement hors ligne.
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); });
walk(dist);
const assets = files.filter((f) => !f.endsWith('sw.js') && !f.endsWith('metadata.json')).map((f) => `${base}/${relative(dist, f).split('\\').join('/')}`);
const version = Date.now().toString(36);
writeFileSync(join(dist, 'sw.js'), `const CACHE = 'anniv-${version}';
const ASSETS = ${JSON.stringify([`${base}/`, ...assets])};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('${base}/'))));
});
`);

let html = readFileSync(join(dist, 'index.html'), 'utf8');
html = html
  .replace('<html lang="en">', '<html lang="fr">')
  .replace('initial-scale=1, shrink-to-fit=no', 'initial-scale=1, viewport-fit=cover')
  .replace('</head>', `
  <link rel="manifest" href="${base}/manifest.webmanifest" />
  <link rel="apple-touch-icon" href="${base}/apple-touch-icon.png" />
  <meta name="theme-color" content="#FFF8F2" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Anniv !" />
  <style>body { background: #FFF8F2; }</style>
  <script>if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('${base}/sw.js'));</script>
</head>`);
writeFileSync(join(dist, 'index.html'), html);
// GitHub Pages : page 404 = l'app, et pas de traitement Jekyll.
writeFileSync(join(dist, '404.html'), html);
writeFileSync(join(dist, '.nojekyll'), '');
console.log(`Version web prête dans dist/ (base « ${base || '/'} », ${assets.length} fichiers en cache)`);
