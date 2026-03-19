const CACHE_NAME = "portx-hub-v2";
const APP_SHELL = ["/", "/manifest.json", "/portx-logo.png"];

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function canCache(request, response) {
  return (
    request.url.startsWith("http") &&
    response &&
    response.status === 200 &&
    response.type !== "opaque"
  );
}

// Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle http/https GET requests
  if (request.method !== "GET" || !request.url.startsWith("http")) return;

  const url = new URL(request.url);

  // Skip HMR and dev tools in development
  if (url.pathname.includes("__next") || url.pathname.includes("_next/webpack")) return;

  // Network-first for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (canCache(request, res)) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static assets
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|woff2?|ttf|css)$/) ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (canCache(request, res)) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // Network-first for pages
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (canCache(request, res)) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(request).then((c) => c || caches.match("/")))
  );
});
