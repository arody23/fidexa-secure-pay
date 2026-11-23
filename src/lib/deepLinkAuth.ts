import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { NATIVE_OAUTH_REDIRECT } from '@/lib/native';

let started = false;

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

function navigateInApp(path: string): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === path) return;
  window.history.replaceState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function extractAuthParams(url: string): { code?: string; access_token?: string; refresh_token?: string; next: string } {
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code') || undefined;
    // Some flows put tokens in the hash fragment
    const hash = parsed.hash?.startsWith('#') ? parsed.hash.slice(1) : parsed.hash || '';
    const hashParams = new URLSearchParams(hash);
    return {
      code,
      access_token: hashParams.get('access_token') || parsed.searchParams.get('access_token') || undefined,
      refresh_token: hashParams.get('refresh_token') || parsed.searchParams.get('refresh_token') || undefined,
      next: safeNextPath(parsed.searchParams.get('next')),
    };
  } catch {
    return { next: '/dashboard' };
  }
}

async function handleAuthReturnUrl(url: string): Promise<boolean> {
  const isOurCallback =
    url.startsWith(NATIVE_OAUTH_REDIRECT) ||
    url.includes('://auth/callback') ||
    url.includes('access_token=') ||
    url.includes('code=');

  if (!isOurCallback) return false;

  const { code, access_token, refresh_token, next } = extractAuthParams(url);

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
    } else {
      return false;
    }

    // Land in provider space after the Custom Tab closes, without opening the public site.
    navigateInApp(next);
  } finally {
    try {
      await Browser.close();
    } catch {
      /* Custom Tab may already be closed */
    }
  }

  return true;
}

/**
 * Listen for OAuth deep links so the user returns into FidexaPay (not stuck in browser).
 * Call once at app boot on native platforms.
 */
export async function startNativeAuthDeepLinks(): Promise<void> {
  if (!Capacitor.isNativePlatform() || started) return;
  started = true;

  App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
    try {
      await handleAuthReturnUrl(event.url);
    } catch (err) {
      console.error('[deepLinkAuth] OAuth return failed', err);
      try {
        await Browser.close();
      } catch {
        /* ignore */
      }
    }
  });

  // Cold start: app launched by the redirect URL
  try {
    const launch = await App.getLaunchUrl();
    if (launch?.url) {
      await handleAuthReturnUrl(launch.url);
    }
  } catch {
    /* ignore */
  }
}
