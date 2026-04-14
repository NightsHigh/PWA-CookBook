// Install Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker has been installed');
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker has been activated');
  event.waitUntil(self.clients.claim());
});

// Fetch event
self.addEventListener('fetch', event => {
  console.log('Fetch event:', event.request.url);
});
