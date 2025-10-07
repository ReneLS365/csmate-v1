const CACHE_NAME = 'csmate-v1.2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './print.css',
  './main.js',
  './dataset.js',
  './complete_lists.json',
  './manifest.json',
  './placeholder_light_gray_block.png',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => keys.filter(key => key !== CACHE_NAME))
      .then(oldKeys => Promise.all(oldKeys.map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).catch(() => caches.match('./index.html'));
    }),
  );
});
