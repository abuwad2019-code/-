const CACHE_NAME = 'tashfir-v3-fix';
const OFFLINE_PAGE = 'index.html';

const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Ensure index.html is definitely cached
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.error(err));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // Take control immediately
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
  if (!event.request.url.startsWith('http')) return;

  // Strategy for HTML (Navigation): Network First, but fallback to Cache on ANY error (Offline or 404)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If server returns 404 or error, fall back to cache immediately
          // This intercepts the "Code: NOT_FOUND" page from the server
          if (!response || response.status === 404 || response.status >= 500) {
             return caches.match(OFFLINE_PAGE);
          }
          
          // If response is good, clone it to cache for next time
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          // Totally offline? Return cached index.html
          return caches.match(OFFLINE_PAGE).then(cachedRes => {
             // Absolute fallback if index.html is somehow missing from specific match
             return cachedRes || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Strategy for Assets: Stale-While-Revalidate
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
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});