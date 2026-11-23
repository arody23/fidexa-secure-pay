import { Capacitor } from '@capacitor/core';

export type NativeNotificationPermission =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'prompt-with-rationale'
  | 'unknown';

export async function checkNativeNotificationPermission(): Promise<NativeNotificationPermission> {
  if (!Capacitor.isNativePlatform()) return 'unknown';

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const status = await LocalNotifications.checkPermissions();
    return status.display ?? 'unknown';
  } catch (err) {
    console.warn('[notifications] Native permission check failed', err);
    return 'unknown';
  }
}

export async function requestNativeNotificationPermission(): Promise<NativeNotificationPermission> {
  if (!Capacitor.isNativePlatform()) return 'unknown';

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return 'granted';
    const requested = await LocalNotifications.requestPermissions();
    return requested.display ?? 'unknown';
  } catch (err) {
    console.warn('[notifications] Native permission request failed', err);
    return 'unknown';
  }
}
