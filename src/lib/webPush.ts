/** Convertit une clé VAPID publique base64url en Uint8Array pour PushManager.subscribe */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`${label} (délai ${ms}ms dépassé)`)), ms);
    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

/** Enregistre / récupère le SW PWA (évite le hang sur navigator.serviceWorker.ready). */
async function getPushRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker non supporté');
  }

  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    registration = await withTimeout(
      navigator.serviceWorker.register('/sw.js', { scope: '/' }),
      12000,
      'Enregistrement du service worker'
    );
  }

  if (registration.installing) {
    await withTimeout(
      new Promise<void>((resolve) => {
        registration!.installing!.addEventListener('statechange', () => {
          if (registration!.installing?.state === 'installed' || registration!.active) {
            resolve();
          }
        });
        // Sécurité si l'état a déjà changé
        window.setTimeout(() => resolve(), 8000);
      }),
      10000,
      'Installation du service worker'
    );
  }

  if (registration.waiting && !registration.active) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  if (registration.active) return registration;

  return withTimeout(navigator.serviceWorker.ready, 10000, 'Service worker ready');
}

async function persistSubscription(
  endpoint: string,
  p256dh: string,
  auth: string
): Promise<void> {
  const { supabase } = await import('@/integrations/supabase/client');

  const { error: rpcError } = await supabase.rpc('upsert_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
  });

  if (!rpcError) return;

  // Fallback table directe si la RPC n'existe pas encore
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw rpcError;

  const { error: upsertError } = await supabase.from('push_subscriptions' as never).upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
    } as never,
    { onConflict: 'user_id,endpoint' }
  );

  if (upsertError) throw upsertError ?? rpcError;
}

export async function subscribeToPush(_userId: string): Promise<boolean> {
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidPublicKey?.trim()) {
    throw new Error('Clé VAPID publique manquante (VITE_VAPID_PUBLIC_KEY)');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await getPushRegistration();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await withTimeout(
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey.trim()),
      }),
      15000,
      'Abonnement PushManager'
    );
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  await persistSubscription(json.endpoint, json.keys.p256dh, json.keys.auth);
  return true;
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  const registration = await getPushRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await subscription.unsubscribe();
  const { supabase } = await import('@/integrations/supabase/client');
  await supabase
    .from('push_subscriptions' as never)
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', subscription.endpoint);
}
