const CACHE_NAME = 'stego-guard-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignore non-http requests (like blob:, data:, chrome-extension:)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Navigation requests (HTML) - Network First, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If online, cache the latest version
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
             cache.put(event.request, responseToCache).catch(err => {
               // Ignore QuotaExceededError or other cache errors to keep app running
               console.warn('SW Cache Error (Navigate):', err);
             });
          });
          return response;
        })
        .catch(() => {
          // If offline, try cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Static assets - Stale While Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache valid responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(err => {
               // Ignore QuotaExceededError
               console.warn('SW Cache Error (Asset):', err);
            });
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed
      });

      return cachedResponse || fetchPromise;
    })
  );
});