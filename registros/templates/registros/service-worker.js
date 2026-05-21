const APP_CACHE = "planilla-rural-v2";
const STATIC_CACHE = "planilla-rural-static-v2";
const API_CACHE = "planilla-rural-api-v1";

const APP_SHELL = [
  "/login/",
  "/manifest.webmanifest",
  "/static/registros/icons/app-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_CACHE && key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

function isApiCacheable(request, url) {
  return request.method === "GET" && url.origin === self.location.origin && (
    url.pathname === "/api/registros/" ||
    url.pathname.startsWith("/api/registros/") ||
    url.pathname === "/api/corrales/mapa/" ||
    url.pathname.startsWith("/api/corrales/")
  );
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkFetch;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const fromRequest = await caches.match(request);
          if (fromRequest) return fromRequest;
          const loginFallback = await caches.match("/login/");
          return loginFallback || Response.error();
        }),
    );
    return;
  }

  if (isApiCacheable(request, url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.pathname.startsWith("/static/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      }),
    );
  }
});