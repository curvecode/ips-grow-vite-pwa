// Service Worker for Daily Buy Tracker PWA
const CACHE_NAME = 'daily-buy-tracker-v2'; // Periodic version update
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache initial resources and skip waiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching shell assets');
        return cache.addAll(urlsToCache);
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
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Helper function to check if a request should be cached
function isCacheableRequest(request) {
  const url = new URL(request.url);
  
  // Skip API requests - handled separately or via network
  if (url.pathname.includes('/api/')) return false;

  // Skip Vite dev server internal assets
  if (url.pathname.includes('/@vite/') || url.search.includes('import')) return false;
  if (url.hostname === 'localhost' && url.port === '5173') {
    // During development, we mostly want network first or no cache
  }

  const scheme = url.protocol;
  return (scheme === 'http:' || scheme === 'https:') && request.method === 'GET';
}

// Fetch event - Network First Strategy with Cache fallback
self.addEventListener('fetch', (event) => {
  if (!isCacheableRequest(event.request)) {
    return;
  }

  event.respondWith(
    // Try network first
    fetch(event.request)
      .then((response) => {
        // If valid response, clone and cache it
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails (offline), try the cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If both fail, we can return a custom offline page if we had one
          return new Response('Network error occurred while offline', {
            status: 404,
            statusText: 'Network error'
          });
        });
      })
  );
});

