// Service Worker for Daily Buy Tracker PWA
const APP_SHELL_CACHE = "daily-buy-tracker-shell-v3";
const API_CACHE = "daily-buy-tracker-api-v1";

const appShellUrls = ["/", "/index.html", "/manifest.json"];

// Install event - cache initial resources and skip waiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => {
        console.log("[SW] Caching app shell assets");
        return cache.addAll(appShellUrls);
      })
  );
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== APP_SHELL_CACHE && cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

function isHttpGetRequest(request) {
  const url = new URL(request.url);
  return (url.protocol === "http:" || url.protocol === "https:") && request.method === "GET";
}

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

function isDailyBuysApiRequest(url) {
  return url.origin === "http://localhost:3000" && url.pathname === "/api/daily-buys";
}

function isStaticAssetRequest(url) {
  return url.origin === self.location.origin;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (!isHttpGetRequest(event.request)) {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // CASE 1: Navigation - network first, then stay on cached app shell
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          if (cachedPage) return cachedPage;
          const appShell = await caches.match("/index.html");
          if (appShell) return appShell;
          return new Response("Network error occurred while offline", {
            status: 503,
            statusText: "Offline",
          });
        })
    );
    return;
  }

  // CASE 2: API list fetch - network first, fallback to last cached API payload
  if (isDailyBuysApiRequest(requestUrl)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request, { cacheName: API_CACHE });
          if (cached) return cached;
          return new Response(JSON.stringify({ success: true, data: [] }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
          });
        })
    );
    return;
  }

  // CASE 3: Static assets - stale while revalidate
  if (!isStaticAssetRequest(requestUrl)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => cached);

      if (cached) {
        event.waitUntil(networkFetch);
        return cached;
      }

      return networkFetch.then((response) => {
        if (response) {
          return response;
        }
        return new Response("Network error occurred while offline", {
          status: 404,
          statusText: "Network error",
        });
      });
    })
  );
});

