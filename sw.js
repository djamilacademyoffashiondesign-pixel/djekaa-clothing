/* Service worker — instance Djekaa (SanaaPro)
   IMPORTANT : toutes les boutiques SanaaPro partagent maintenant le meme
   domaine (sanaapro.github.io). Les caches d'un service worker sont communs
   a tout le domaine, PAS au dossier. Le nom du cache doit donc contenir le
   nom de la boutique, sinon une boutique effacerait les fichiers d'une autre. */
const CACHE = 'sanaapro-djekaa-v1';
const PREFIXE = 'sanaapro-djekaa-';

const A_PRECHARGER = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
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
      /* On ne supprime que NOS anciennes versions, jamais celles d'une autre boutique. */
      noms.filter((n) => n.startsWith(PREFIXE) && n !== CACHE)
          .map((n) => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Ne jamais intercepter Firebase, Google, les CDN ni WhatsApp :
     ces requetes doivent toujours partir directement sur le reseau. */
  if (url.origin !== self.location.origin) return;

  const estNavigation = req.mode === 'navigate';
  const estManifeste = url.pathname.endsWith('manifest.json');

  /* Reseau d'abord pour la navigation et le manifeste : l'app et l'icone
     ne restent jamais bloquees sur une vieille version en cache. */
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

  /* Cache d'abord pour le reste du statique (icones, config), avec
     rafraichissement en arriere-plan. */
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
