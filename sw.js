const CACHE_NAME = 'tashfir-v4-stable';
const MAIN_PAGE = './index.html';

// Normalize paths to ensure cache keys match exactly what we request
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.error('SW Pre-cache failed:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle http/https requests
  if (!event.request.url.startsWith('http')) return;

  // 1. Navigation Strategy (Opening the app) -> Network First, Strong Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try network first
          const networkResponse = await fetch(event.request);
          
          // If server returns 404 (NOT_FOUND) or 500, throw to trigger catch
          if (!networkResponse || !networkResponse.ok) {
            throw new Error('Network error or 404');
          }

          // Save valid response
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          // Fallback to cache
          const cache = await caches.open(CACHE_NAME);
          
          // Try to find the exact page
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) return cachedResponse;

          // If not found, serve the main index.html (SPA logic)
          // We check specifically for the key we stored './index.html'
          const mainPage = await cache.match(MAIN_PAGE);
          if (mainPage) return mainPage;
          
          // Last resort: check for root '/'
          return cache.match('./');
        }
      })()
    );
    return;
  }

  // 2. Assets Strategy -> Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Ignore network errors for assets if offline
      });

      return cachedResponse || fetchPromise;
    })
  );
});