/* Service worker — instance Djekaa (SanaaPro)
   Les boutiques SanaaPro partagent le meme domaine (sanaapro.github.io).
   Les caches sont communs a tout le domaine, PAS au dossier : le nom du
   cache doit contenir le nom de la boutique. */
const CACHE = 'sanaapro-djekaa-v1';
const PREFIXE = 'sanaapro-djekaa-';

const A_PRECHARGER = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './icon-192-1.png',
  './icon-512-1.png',
  './icon-512-maskable-1.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(A_PRECHARGER).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((noms) => Promise.all(
      noms.filter((n) => n.startsWith(PREFIXE) && n !== CACHE)
          .map((n) => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const estNavigation = req.mode === 'navigate';
  const estManifeste = url.pathname.endsWith('manifest.json');

  if (estNavigation || estManifeste) {
    e.respondWith(
      fetch(req)
        .then((rep) => {
          const copie = rep.clone();
          caches.open(CACHE).then((c) => c.put(req, copie)).catch(() => {});
          return rep;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      const reseau = fetch(req).then((rep) => {
        const copie = rep.clone();
        caches.open(CACHE).then((c) => c.put(req, copie)).catch(() => {});
        return rep;
      }).catch(() => cached);
      return cached || reseau;
    })
  );
});
