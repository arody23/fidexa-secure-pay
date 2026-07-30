/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Le manifeste de precaching est injecté ici par vite-plugin-pwa au build
const ASSETS = self.__WB_MANIFEST;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event: PushEvent) => {
  let payload: { title?: string; body?: string; url?: string } = {
    title: 'FidexaPay',
    body: 'Nouvelle notification',
  };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    payload.body = event.data?.text() || payload.body;
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'FidexaPay', {
      body: payload.body || '',
      icon: '/assets/icons/Favicon.png',
      badge: '/assets/icons/Favicon.png',
      data: payload.url ? { url: payload.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url || '/dashboard/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          void (client as WindowClient).navigate(url);
          return (client as WindowClient).focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Precaching minimaliste : mettre les assets en cache lors de l'installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('fidexa-precache').then((cache) => {
      return cache.addAll(ASSETS.map((entry) => (typeof entry === 'string' ? entry : entry.url)));
    }).catch(() => undefined)
  );
});
