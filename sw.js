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
  './img/dish.png'
];
// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(staticCacheName).then(cache => cache.addAll(staticAssets))
  );
  self.skipWaiting();
});

// Activate Service Worker
// Funktion til styring af antal filer i en given cache
const limitCacheSize = (cacheName, numberOfAllowedFiles) => {
	// Åbn den angivede cache
	caches.open(cacheName).then(cache => {
		// Hent array af cache keys 
		cache.keys().then(keys => {
			// Hvis mængden af filer overstiger det tilladte
			if(keys.length > numberOfAllowedFiles) {
				// Slet første index (ældste fil) og kør funktion igen indtil antal er nået
				cache.delete(keys[0]).then(() => limitCacheSize(cacheName, numberOfAllowedFiles))
			}
		})
	})
}
self.addEventListener('activate', event => {

	event.waitUntil(
		// Rydder op i cache og sletter alle uaktuelle caches
		caches.keys().then(keys => {
			// Returnerer et array af promises
			return Promise.all(keys
				// Filterer alle keys som ikke er en del af den aktuelle cache
				.filter(key => key !== staticCacheName && key !== dynamicCacheName)
				// Sletter cache version asynkront
				.map(key => caches.delete(key)))
		})
	)
	self.clients.claim();
})

// Fetch event
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cacheRes => {
      if (cacheRes) return cacheRes;

      return fetch(event.request).then(fetchRes => {
        const fetchClone = fetchRes.clone();
        caches.open(dynamicCacheName).then(cache => {
          cache.put(event.request, fetchClone);
          // Kalder limit cache funktionen
          limitCacheSize(dynamicCacheName, 50);
        });
        return fetchRes;
      });
    })
  );
});