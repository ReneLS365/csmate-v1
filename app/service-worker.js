/* CSMate Service Worker – cache busting hard mode */
const VERSION = 'v20251029T143523'; // replaced automatically during build
const CACHE_VERSION = VERSION; // replaced automatically during build
const CACHE_PREFIX = 'csmate';
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const PRECACHE = [
  '/',
  '/index.html',
  '/main.js',
  '/style.css',
  '/print.css',
  '/manifest.json',
  '/src/ui/numpad.css',
  '/src/styles/fixes.css',
];

const DATA_MATCHERS = [/\/data\//, /\.json(?:\?|$)/i];

function notifyClients(message) {
  return self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => client.postMessage(message));
  });
}

async function precacheCoreAssets() {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE);
  } catch (error) {
    console.warn('Precache failed', error);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirst(request, fallback) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallback) {
      const fallbackResponse = await caches.match(fallback);
      if (fallbackResponse) return fallbackResponse;
    }
    throw error;
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(precacheCoreAssets());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await precacheCoreAssets();
    await self.clients.claim();
    await notifyClients({ type: 'CSMATE_UPDATED', version: CACHE_VERSION });
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  const acceptsHTML = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  if (acceptsHTML) {
    event.respondWith(networkFirst(request, '/index.html').catch(() => caches.match('/index.html')));
    return;
  }

  if (!sameOrigin) {
    return;
  }

  const isData = DATA_MATCHERS.some((pattern) => pattern.test(url.pathname));
  if (isData) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
