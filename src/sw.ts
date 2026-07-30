/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

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
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/Favicon.ico',
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
