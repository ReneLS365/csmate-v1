/* CSMate Service Worker – cache busting hard mode */
const VERSION = "v2025-10-15-02"; // bump on every deploy
const CACHE_NAME = `csmate-${VERSION}`;
const PRECACHE = [
  "/",
  "/index.html",
  "/main.js",
  "/style.css",
  "/print.css",
  "/manifest.json",
  "/dataset.js",
  "/complete_lists.json",
  "/src/ui/numpad.js",
  "/src/ui/numpad.init.js",
  "/src/lib/string-utils.js",
  "/src/lib/materials/exclusions.js",
  "/src/features/pctcalc/pctcalc.js",
  "/src/features/pctcalc/pctcalc.css",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith("csmate-") && n !== CACHE_NAME)
      .map(n => caches.delete(n)));
    await self.clients.claim();
    // Notify clients to reload
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach(c => c.postMessage({ type: "CSMATE_UPDATED", version: VERSION }));
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Network-first for HTML to avoid stuck old versions
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(fetch(req).catch(() => caches.match("/index.html")));
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
