import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { APP_PUBLIC_URL } from '@/config/site';

/** True when running inside the Capacitor Android/iOS shell. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Public HTTPS origin for client-facing links (payment, order, feedback).
 * Never use capacitor:// or https://localhost here — clients open these in a browser.
 */
export function getPublicWebOrigin(): string {
  if (isNativeApp()) return APP_PUBLIC_URL;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return APP_PUBLIC_URL;
}

export function getPublicPaymentUrl(linkId: string): string {
  return `${getPublicWebOrigin()}/pay/${linkId}`;
}

/** Deep-link scheme registered in AndroidManifest for OAuth return. */
export const NATIVE_OAUTH_REDIRECT = 'com.fidexapay.app://auth/callback';
export const OAUTH_CALLBACK_PATH = '/auth/callback';

function getNativeOAuthBridgeRedirect(path = '/dashboard'): string {
  const bridge = new URL(OAUTH_CALLBACK_PATH, APP_PUBLIC_URL);
  bridge.searchParams.set('native', '1');
  bridge.searchParams.set('next', path.startsWith('/') ? path : `/${path}`);
  return bridge.toString();
}

export function getOAuthRedirectTo(path = '/dashboard'): string {
  if (isNativeApp()) return getNativeOAuthBridgeRedirect(path);
  const origin =
    typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : APP_PUBLIC_URL;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Open HTTPS / external URLs outside the WebView on native; web keeps window.open. */
export async function openExternalUrl(url: string): Promise<void> {
  const absolute = new URL(url, getPublicWebOrigin()).toString();
  if (isNativeApp()) {
    await Browser.open({ url: absolute });
    return;
  }
  const win = window.open(absolute, '_blank', 'noopener,noreferrer');
  if (!win) window.location.assign(absolute);
}
