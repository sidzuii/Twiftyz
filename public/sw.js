/* Minimal service worker: enables PWA install and instant activation.
   All requests pass through to the network (the app is realtime-first). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  // Network passthrough; a cache-first strategy can be added later for offline.
  if (event.request.method !== 'GET') return;
});
