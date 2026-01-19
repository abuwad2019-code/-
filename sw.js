const CACHE_NAME = 'tashfir-v1';

// Pre-cache essential files
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Try to cache core assets. We use catch to prevent install failure 
      // if one file is missing in specific dev environments.
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Pre-caching failed:', err);
      });
    })
  );
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

  // Navigation requests (HTML) - Network First, fallback to Cache, then fallback to index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If valid response, clone and cache it
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
               cache.put(event.request, responseToCache).catch(() => {});
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try to get the specific page from cache
          return caches.match(event.request).then(response => {
             if (response) return response;
             
             // If specific page not found, fallback to index.html (SPA support)
             // Try variations of the root path
             return caches.match('./index.html')
                .then(r => r || caches.match('./'))
                .then(r => r || caches.match('index.html'));
          });
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
            cache.put(event.request, responseToCache).catch(() => {});
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