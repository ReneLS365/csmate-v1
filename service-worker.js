// public/service-worker.js
// BUMP VERSION VED HVERT PRODUCTION DEPLOY
const APP_VERSION = 'v2025-10-15-1';
const CACHE_NAME = `csmate-${APP_VERSION}`;

// Kritiske ruter der skal fungere offline (hold listen kort og stabil)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/print.css',
  '/main.js',
  '/dataset.js',
  '/complete_lists.json',
  '/manifest.json',
  '/placeholder_light_gray_block.png',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => {
      if (key !== CACHE_NAME && key.startsWith('csmate-')) {
        return caches.delete(key);
      }
      return undefined;
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // HTML: network-first (så vi ikke sidder fast i gammelt index.html)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        return fresh;
      } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('/index.html');
        if (cached) {
          return cached;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // Assets under /assets/: cache-first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
      const fresh = await fetch(request);
      cache.put(request, fresh.clone());
      return fresh;
    })());
    return;
  }

  // Default: network with cache fallback
  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch (error) {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
      throw error;
    }
  })());
});
