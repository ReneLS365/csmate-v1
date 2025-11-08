/* CSMate Service Worker – Workbox-inspired offline shell */
const VERSION = 'v20251108T181132-e2903dac'; // replaced automatically during build
const SW_VERSION = VERSION;
const CACHE_VERSION = VERSION; // replaced automatically during build
const CACHE_PREFIX = 'csmate';
const PRECACHE = [
  '/',
  '/?source=pwa',
  '/index.html',
  '/main.js',
  '/style.css',
  '/print.css',
  '/css/pwa.css',
  '/manifest.json',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/src/ui/numpad.css',
  '/src/styles/fixes.css',
  '/src/globals.js',
  '/src/dev.js',
  '/src/keyboard.js'
];

const DATA_MATCHERS = [/\/data\//, /\.json(?:\?|$)/i];
const START_URLS = ['/', '/?source=pwa'];

const PRECACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAMES = {
  html: `${CACHE_PREFIX}-html-${CACHE_VERSION}`,
  assets: `${CACHE_PREFIX}-assets-${CACHE_VERSION}`,
  images: `${CACHE_PREFIX}-images-${CACHE_VERSION}`,
  fonts: `${CACHE_PREFIX}-fonts-${CACHE_VERSION}`,
  data: `${CACHE_PREFIX}-data-${CACHE_VERSION}`
};

const META_CACHE_SUFFIX = '-meta';
const ACTIVE_CACHE_NAMES = new Set([
  PRECACHE_NAME,
  ...Object.values(RUNTIME_CACHE_NAMES).flatMap((name) => [name, `${name}${META_CACHE_SUFFIX}`])
]);

function toMetaRequest(request) {
  return new Request(request.url);
}

async function updateMetadata(cacheName, request) {
  try {
    const metaCache = await caches.open(`${cacheName}${META_CACHE_SUFFIX}`);
    await metaCache.put(toMetaRequest(request), new Response(String(Date.now())));
  } catch (error) {
    console.warn('Metadata update failed', error);
  }
}

async function enforceCacheLimit(cacheName, { maxEntries, maxAgeSeconds }) {
  if (!maxEntries && !maxAgeSeconds) return;
  const metaCache = await caches.open(`${cacheName}${META_CACHE_SUFFIX}`);
  const cache = await caches.open(cacheName);
  const keys = await metaCache.keys();
  if (!keys.length) return;

  const now = Date.now();
  const entries = await Promise.all(
    keys.map(async (request) => {
      const response = await metaCache.match(request);
      const timestamp = response ? Number.parseInt(await response.text(), 10) : now;
      return { request, timestamp };
    })
  );

  const maxAge = typeof maxAgeSeconds === 'number' ? maxAgeSeconds * 1000 : Infinity;
  const freshEntries = [];

  await Promise.all(
    entries.map(async ({ request, timestamp }) => {
      if (now - timestamp > maxAge) {
        await cache.delete(request);
        await metaCache.delete(request);
      } else {
        freshEntries.push({ request, timestamp });
      }
    })
  );

  if (maxEntries && freshEntries.length > maxEntries) {
    freshEntries.sort((a, b) => b.timestamp - a.timestamp);
    const toRemove = freshEntries.slice(maxEntries);
    await Promise.all(
      toRemove.map(async ({ request }) => {
        await cache.delete(request);
        await metaCache.delete(request);
      })
    );
  }
}

async function precacheCoreAssets() {
  const cache = await caches.open(PRECACHE_NAME);
  await cache.addAll(PRECACHE);
}

async function prewarmStartUrls() {
  const cache = await caches.open(RUNTIME_CACHE_NAMES.html);
  await cache.addAll(START_URLS);
  for (const url of START_URLS) {
    await updateMetadata(RUNTIME_CACHE_NAMES.html, new Request(url));
  }
}

async function cleanupLegacyCaches() {
  const existing = await caches.keys();
  await Promise.all(
    existing
      .filter((name) => !ACTIVE_CACHE_NAMES.has(name))
      .map((name) => caches.delete(name))
  );
}

async function networkFirst(request, { cacheName, fallbackUrls = [] } = {}) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
      await updateMetadata(cacheName, request);
      if (fallbackUrls.length) {
        await enforceCacheLimit(cacheName, { maxEntries: 60, maxAgeSeconds: 7 * 24 * 3600 });
      }
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      await updateMetadata(cacheName, request);
      return cached;
    }
    for (const url of fallbackUrls) {
      const fallbackResponse = await caches.match(url);
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName, limits = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    await updateMetadata(cacheName, request);
  }

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
        await updateMetadata(cacheName, request);
        await enforceCacheLimit(cacheName, limits);
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function cacheFirst(request, cacheName, limits = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    await updateMetadata(cacheName, request);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
      await updateMetadata(cacheName, request);
      await enforceCacheLimit(cacheName, limits);
    }
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

async function handleNavigationRequest(event) {
  const request = event.request;
  const preloadResponse = event.preloadResponse ? await event.preloadResponse : null;
  const cache = await caches.open(RUNTIME_CACHE_NAMES.html);

  if (preloadResponse) {
    await cache.put(request, preloadResponse.clone());
    await updateMetadata(RUNTIME_CACHE_NAMES.html, request);
    return preloadResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      await updateMetadata(RUNTIME_CACHE_NAMES.html, request);
    }
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      await updateMetadata(RUNTIME_CACHE_NAMES.html, request);
      return cached;
    }
    for (const url of START_URLS) {
      const fallback = await caches.match(url);
      if (fallback) return fallback;
    }
    throw error;
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      await precacheCoreAssets();
      await prewarmStartUrls();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch (error) {
          console.warn('Navigation preload could not be enabled', error);
        }
      }
      await cleanupLegacyCaches();
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  if (!sameOrigin) {
    return;
  }

  const destination = request.destination;

  if (destination === 'script' || destination === 'style') {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE_NAMES.assets));
    return;
  }

  if (destination === 'image') {
    event.respondWith(
      staleWhileRevalidate(request, RUNTIME_CACHE_NAMES.images, {
        maxEntries: 150,
        maxAgeSeconds: 30 * 24 * 3600
      })
    );
    return;
  }

  if (destination === 'font') {
    event.respondWith(
      cacheFirst(request, RUNTIME_CACHE_NAMES.fonts, {
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 3600
      })
    );
    return;
  }

  const isDataRequest = DATA_MATCHERS.some((pattern) => pattern.test(url.pathname));
  if (isDataRequest) {
    event.respondWith(
      networkFirst(request, {
        cacheName: RUNTIME_CACHE_NAMES.data
      })
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE_NAMES.assets));
});
