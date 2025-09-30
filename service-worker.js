const CACHE_NAME = 'scafix-v8';

self.addEventListener('install', event => {
  // Precache de vigtigste filer til offline brug
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './style.css',
        './print.css',
        './main.js',
        './dataset.js',
        './manifest.json'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Ryd gamle caches væk
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        // Fallback til index.html når offline og resource ikke findes
        return caches.match('./index.html');
      });
    })
  );
});