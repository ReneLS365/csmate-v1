/* CSMate Service Worker – cache busting hard mode */
const VERSION = 'v20251025T140510'; // replaced automatically during build
const CACHE_NAME = `csmate-${VERSION}`;
const PRECACHE = [
  "/",
  "/index.html",
  "/main.js",
  "/style.css",
  "/print.css",
  "/manifest.json",
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {});
    await self.clients.claim();
    // Notify clients to reload
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => client.postMessage({ type: 'CSMATE_UPDATED', version: VERSION }));
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Network-first for HTML to avoid stuck old versions
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  // Cache-first then network for static assets
  event.respondWith(
    caches.match(req).then((res) => res || fetch(req).then((r) => {
      const copy = r.clone();
      caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
      return r;
    }))
  );
});
