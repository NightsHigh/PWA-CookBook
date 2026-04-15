const staticCacheName = 'site-static-v2';
const dynamicCacheName = 'site-dynamic-v1';

const staticAssets = [
  './',
  './index.html',
  './pages/about.html',
  './css/materialize.min.css',
  './css/styles.css',
  './js/materialize.min.js',
  './js/ui.js',
  './manifest.json',
  './img/dish.png',
  './pages/fallback.html'
];

// INSTALL — køres én gang når service workeren registreres første gang.
// Åbner den statiske cache og gemmer alle kendte filer på forhånd.
// skipWaiting() tvinger denne worker til at aktivere med det samme, uden at
// vente på at eksisterende sider med en ældre worker lukkes.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(staticCacheName).then(cache => cache.addAll(staticAssets))
  );
  self.skipWaiting();
});

// Begrænser en cache til et maksimalt antal filer ved at slette den ældste
// post (keys[0]) rekursivt, indtil grænsen er nået.
const limitCacheSize = (cacheName, numberOfAllowedFiles) => {
  caches.open(cacheName).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > numberOfAllowedFiles) {
        // Slet den ældste post, og tjek derefter igen hvis flere skal fjernes
        cache.delete(keys[0]).then(() => limitCacheSize(cacheName, numberOfAllowedFiles));
      }
    });
  });
};

// clients.claim() gør at denne worker overtager styringen af åbne sider med det samme,
// i stedet for at vente på en genindlæsning af siden.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== staticCacheName && key !== dynamicCacheName)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cacheRes => {
      if (cacheRes) return cacheRes;

      // Cache-miss — hent fra netværket og gem resultatet dynamisk
      return fetch(event.request).then(fetchRes => {
        // Klon responsen fordi den kun kan læses én gang —
        // én kopi gemmes i cachen, den anden returneres til siden
        const fetchClone = fetchRes.clone();
        caches.open(dynamicCacheName).then(cache => {
          cache.put(event.request, fetchClone);
          // Forhindrer den dynamiske cache i at vokse uden begrænsning
          limitCacheSize(dynamicCacheName, 50);
        });
        return fetchRes;
      }).catch(() => {
        // Netværk fejlede og siden er ikke cachet — vis fallback for HTML-sider
        if (event.request.url.indexOf('.html') > -1) {
          return caches.match('./pages/fallback.html');
        }
      });
    })
  );
});