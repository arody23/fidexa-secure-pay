/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Le manifeste de precaching est injecté ici par vite-plugin-pwa au build
const ASSETS = self.__WB_MANIFEST;

const ORIGIN = self.location.origin;
const ICON_192 = `${ORIGIN}/assets/icons/icon-192.png`;
const ICON_BADGE = `${ORIGIN}/assets/icons/Favicon.png`;

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

  const targetUrl = payload.url?.startsWith('http')
    ? payload.url
    : `${ORIGIN}${payload.url || '/dashboard/notifications'}`;

  event.waitUntil(
    self.registration.showNotification(payload.title || 'FidexaPay', {
      body: payload.body || '',
      icon: ICON_192,
      badge: ICON_BADGE,
      image: undefined,
      tag: `fidexa-${Date.now()}`,
      renotify: true,
      vibrate: [120, 60, 120],
      requireInteraction: false,
      data: { url: targetUrl },
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const raw = (event.notification.data as { url?: string } | undefined)?.url;
  const url = raw?.startsWith('http') ? raw : `${ORIGIN}${raw || '/dashboard/notifications'}`;

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
    caches
      .open('fidexa-precache')
      .then((cache) =>
        cache.addAll(ASSETS.map((entry) => (typeof entry === 'string' ? entry : entry.url)))
      )
      .catch(() => undefined)
  );
});
