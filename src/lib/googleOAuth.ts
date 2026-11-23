import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';
import { getOAuthRedirectTo, isNativeApp } from '@/lib/native';

type GoogleOAuthTarget = 'signin' | 'signup';

/**
 * Google OAuth for web + Capacitor Android.
 * Native: system browser / Custom Tabs + deep link back into the app (PKCE).
 * Web: unchanged redirect flow.
 */
export async function signInWithGoogle(target: GoogleOAuthTarget = 'signin'): Promise<void> {
  const redirectTo =
    target === 'signup' ? getOAuthRedirectTo('/dashboard/profile') : getOAuthRedirectTo('/dashboard');

  if (!isNativeApp()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('URL Google OAuth indisponible');

  await Browser.open({ url: data.url, presentationStyle: 'popover' });
}
