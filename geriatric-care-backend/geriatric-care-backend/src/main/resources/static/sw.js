// Service Worker for Geriatric Care PWA
const CACHE_NAME = 'geriatric-care-v1.0.0';
const urlsToCache = [
  '/',
  '/styles/main.css',
  '/scripts/app.js',
  'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/lucide/0.263.1/lucide.min.css'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'emergency-alert') {
    event.waitUntil(
      // Send queued emergency alerts when back online
      sendEmergencyAlerts()
    );
  }
});

async function sendEmergencyAlerts() {
  // Implementation for sending queued emergency alerts
  console.log('Service Worker: Sending queued emergency alerts');
}

// Push notifications for medication reminders
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Medication reminder',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'take-medication',
        title: 'Take Medication',
        icon: '/icon-check.png'
      },
      {
        action: 'snooze',
        title: 'Snooze 5 min',
        icon: '/icon-snooze.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Medication Reminder', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'take-medication') {
    // Open app to medication section
    event.waitUntil(
      clients.openWindow('/medications')
    );
  } else if (event.action === 'snooze') {
    // Snooze medication reminder
    console.log('Medication reminder snoozed for 5 minutes');
  } else {
    // Open main app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});