/* ============================================
   Service Worker - Control de Stock PWA
   Cache-first for static, Network-first for API
   ============================================ */

const CACHE_VERSION = 'stock-ctrl-v2-20260611';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const SYNC_TAG = 'sync-operations';

// Base dinámica — funciona en localhost (/), GitHub Pages (/control-de-stock/) y cualquier subpath
const SCOPE = self.registration.scope; // ej: 'https://ultrastein.github.io/control-de-stock/'

// Static assets to pre-cache
const PRECACHE_ASSETS = [
  SCOPE,
  SCOPE + 'index.html',
  SCOPE + 'manifest.json',
  SCOPE + 'src/css/variables.css',
  SCOPE + 'src/css/base.css',
  SCOPE + 'src/css/components.css',
  SCOPE + 'src/css/layouts.css',
  SCOPE + 'src/css/kiosk.css',
  SCOPE + 'src/css/animations.css',
  SCOPE + 'src/js/app.js',
  SCOPE + 'src/js/api/client.js',
  SCOPE + 'src/js/api/endpoints.js',
  SCOPE + 'src/js/store/db.js',
  SCOPE + 'src/js/store/syncManager.js',
  SCOPE + 'src/js/store/state.js',
  SCOPE + 'src/js/components/Scanner.js',
  SCOPE + 'src/js/components/DataTable.js',
  SCOPE + 'src/js/components/Modal.js',
  SCOPE + 'src/js/components/Toast.js',
  SCOPE + 'src/js/components/FileUpload.js',
];

// ── Install ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(() => {
        return self.skipWaiting();
      })
  );
});

// ── Activate ─────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
            .map((name) => {
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    return;
  }

  // API calls → Network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Google Fonts → Cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Static assets → Cache-first
  event.respondWith(cacheFirst(request));
});

// ── Cache-first strategy ─────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match(SCOPE + 'index.html');
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ── Network-first strategy ───────────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response(
      JSON.stringify({ error: 'Sin conexión', offline: true }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ── Background Sync ──────────────────────────
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  try {
    const db = await openSyncDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const operations = request.result;

        for (const op of operations) {
          try {
            const response = await fetch(op.url, {
              method: op.method,
              headers: op.headers,
              body: op.body ? JSON.stringify(op.body) : undefined
            });

            if (response.ok) {
              await removeFromSyncQueue(db, op.id);
              // Notify clients
              const clients = await self.clients.matchAll();
              clients.forEach((client) => {
                client.postMessage({
                  type: 'SYNC_COMPLETE',
                  operation: op,
                  success: true
                });
              });
            }
          } catch {
            // operation stays in queue for next sync attempt
          }
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    // sync will be retried on next sync event
  }
}

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StockControlDB', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cachedData')) {
        db.createObjectStore('cachedData', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function removeFromSyncQueue(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ── Push Notifications (placeholder) ─────────
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Nueva notificación',
    icon: SCOPE + 'icons/icon-192x192.png',
    badge: SCOPE + 'icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: data.url || '/'
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Control de Stock', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data)
  );
});
