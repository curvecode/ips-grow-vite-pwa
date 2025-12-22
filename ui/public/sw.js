// Service Worker for Daily Buy Tracker PWA
const CACHE_NAME = 'daily-buy-tracker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.ts',
  '/src/ui.ts',
  '/src/style.css',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Helper function to check if URL scheme is cacheable
function isCacheableRequest(request) {
  const url = new URL(request.url);
  const scheme = url.protocol;
  
  // Only cache http:// and https:// requests
  // Exclude chrome-extension://, chrome://, moz-extension://, etc.
  if (scheme !== 'http:' && scheme !== 'https:') {
    return false;
  }
  
  // Only cache GET requests
  if (request.method !== 'GET') {
    return false;
  }
  
  return true;
}

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-cacheable requests (chrome extensions, etc.)
  if (!isCacheableRequest(event.request)) {
    return; // Let browser handle it normally
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          (response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Double-check request is still cacheable before caching
            if (!isCacheableRequest(event.request)) {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                try {
                  cache.put(event.request, responseToCache);
                } catch (error) {
                  // Silently fail if caching is not possible
                  console.warn('Failed to cache request:', event.request.url, error);
                }
              })
              .catch((error) => {
                // Silently fail if caching is not possible
                console.warn('Failed to open cache:', error);
              });
            return response;
          }
        ).catch((error) => {
          // Network error - return cached version if available
          console.warn('Fetch failed, trying cache:', error);
          return caches.match(event.request);
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

