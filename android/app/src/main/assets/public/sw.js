const CACHE_NAME = 'famichat-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-famichat.png'
];

// Install event: Cache critical shell assets safely without blocking installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const cachePromises = ASSETS_TO_CACHE.map((asset) => {
        return cache.add(asset).catch((err) => {
          console.warn(`Could not cache asset: ${asset}`, err);
        });
      });
      return Promise.all(cachePromises);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event: Clean older caches up
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
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event listener: Network-first approach with API safety guards
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL: NEVER cache API routes or dynamic server resources
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return; // Let the browser handle standard live requests
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If we get a valid response, cache a copy of it
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If the network fails, fall back to the cached resource
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If everything fails (no cache match for some reason), return a fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// Push notification event listener: triggers when backend sends a real Web Push payload
self.addEventListener('push', (event) => {
  let data = { title: 'FamiChat', body: 'Tienes un nuevo mensaje en el chat familiar' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (err) {
      data = { title: 'FamiChat', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/logo-famichat.png',
    badge: '/logo-famichat.png',
    tag: data.tag || 'famichat-new-msg',
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click listener: redirects the user straight to the conversational context
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If there's an existing opened tab, focus it and navigate
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          // Send message to client to change active channel
          if (client.url.includes(self.location.origin)) {
            client.postMessage({ type: 'NAVIGATE_ROOM', url: urlToOpen });
            return client.focus();
          }
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

