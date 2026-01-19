const CACHE_NAME = 'tashfir-v2';

// Explicitly cache index.html to ensure start_url works
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // We force adding index.html
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.error('Pre-caching failed:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  // Claim clients immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
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
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Ignore non-http requests
  if (!event.request.url.startsWith('http')) return;

  // Handle Navigation (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // 1. Try Network First
          const networkResponse = await fetch(event.request);
          
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }
        } catch (error) {
          // Network failed
        }

        // 2. Fallback to Cache (exact match)
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // 3. Fallback to index.html (SPA routing)
        // Try multiple variations to find the cached index.html
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        const indexKey = keys.find(request => request.url.endsWith('index.html'));
        
        if (indexKey) {
          return cache.match(indexKey);
        }
        
        return caches.match('./index.html');
      })()
    );
    return;
  }

  // Handle Static Assets (Stale-While-Revalidate)
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
        // Eat errors for static assets if offline
      });

      return cachedResponse || fetchPromise;
    })
  );
});