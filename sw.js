// Local Notifications Service Worker - No Firebase Dependencies

const CACHE_NAME = 'doodhdaily-local-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/Title.png',
  '/image.png'
];

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Cache install failed:', err))
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event with intelligent caching
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip cache for API calls (holidays only)
  if (url.hostname.includes('calendarific.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response('{"error": "offline"}', {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          // Cache new resources
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache));
          }
          return response;
        });
      })
      .catch(() => {
        // Fallback for offline
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Enhanced notification click handler
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event.notification.tag, event.notification.data);
  
  // Close the notification
  event.notification.close();
  
  // Open or focus the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Check if app is already open
      for (const client of clients) {
        if (client.url === self.location.origin + '/' && 'focus' in client) {
          // App is already open, just focus it
          client.focus();
          // Send message to app that notification was clicked
          client.postMessage({ 
            type: 'notification-clicked',
            data: event.notification.data 
          });
          return;
        }
      }
      
      // App is not open, open it
      if (self.clients.openWindow) {
        return self.clients.openWindow('/').then(client => {
          // Send message to newly opened app
          setTimeout(() => {
            client.postMessage({ 
              type: 'notification-clicked',
              data: event.notification.data 
            });
          }, 1000);
        });
      }
    })
  );
});

// Handle push events (for future server-side notifications if needed)
self.addEventListener('push', event => {
  console.log('Push event received');
  
  const options = {
    body: 'Did you buy milk today?',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'milk-reminder',
    data: {
      type: 'milk-reminder',
      date: new Date().toISOString().split('T')[0],
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification('🥛 Milk Reminder', options)
  );
});

// Sync event for background sync (if supported)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Background sync event');
    // Handle background sync tasks here if needed
  }
});
