/* ============================================
   FlyHighManarang PWA - Service Worker
   Enables offline functionality
   ============================================ */

const CACHE_NAME = 'flyhighmanarang-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './db.js',
  './supabase-config.js',
  './sync-manager.js',
  './manifest.json',
  './icons/icon.svg',
  'https://unpkg.com/dexie@latest/dist/dexie.js',
  'https://unpkg.com/@supabase/supabase-js@2'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        console.log('[ServiceWorker] Cache error:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }

        // Not in cache - fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Check if valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response
            const responseToCache = networkResponse.clone();

            // Add to cache for future
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // Network failed - return offline page for navigation
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return null;
          });
      })
  );
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: './icons/icon.svg',
    badge: './icons/icon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('FlyHighManarang', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click received.');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('./')
  );
});

// Background sync for offline data sync
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sync event:', event.tag);

  if (event.tag === 'sync-data' || event.tag === 'sync-transactions') {
    event.waitUntil(
      notifyClientsToSync()
    );
  }
});

// Notify all clients to sync their data
async function notifyClientsToSync() {
  const allClients = await clients.matchAll({ includeUncontrolled: true });

  for (const client of allClients) {
    client.postMessage({
      type: 'SYNC_REQUIRED',
      timestamp: Date.now()
    });
  }

  console.log('[ServiceWorker] Notified', allClients.length, 'clients to sync');
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SYNC_COMPLETE') {
    console.log('[ServiceWorker] Sync completed successfully');
  }
});

// Listen for online event and trigger sync
self.addEventListener('online', () => {
  console.log('[ServiceWorker] Online detected, triggering sync');
  notifyClientsToSync();
});

console.log('[ServiceWorker] Loaded with Supabase sync support');
