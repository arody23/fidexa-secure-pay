import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NATIVE_OAUTH_REDIRECT, isNativeApp } from '@/lib/native';

/**
 * HTTPS landing for OAuth PKCE.
 * Native flow: Custom Tab lands here with ?native=1&code=... then jumps to
 * com.fidexapay.app://auth/callback so the Capacitor app receives the session.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [bridging, setBridging] = useState(false);

  const deepLink = useMemo(() => {
    if (typeof window === 'undefined') return NATIVE_OAUTH_REDIRECT;
    return `${NATIVE_OAUTH_REDIRECT}${window.location.search}${window.location.hash}`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const href = window.location.href;
        const url = new URL(href);
        const code = url.searchParams.get('code');
        const nativeBridge = url.searchParams.get('native') === '1';

        // Custom Tab / external browser after Google → bounce into the Android app
        if (nativeBridge && !isNativeApp()) {
          setBridging(true);
          window.location.replace(deepLink);
          return;
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error('Session introuvable après Google');
        }

        if (isNativeApp()) {
          try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.close();
          } catch {
            /* ignore */
          }
        }

        if (!cancelled) {
          const next = url.searchParams.get('next');
          navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard', {
            replace: true,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Authentification échouée');
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [deepLink, navigate]);

  return (
    <AuthLayout>
      <Card>
        <CardContent className="space-y-4 py-8 text-center text-sm text-muted-foreground">
          {error ? (
            <>
              <p className="text-destructive">{error}</p>
              <button type="button" className="text-primary underline" onClick={() => navigate('/auth/signin')}>
                Retour connexion
              </button>
            </>
          ) : bridging ? (
            <>
              <p className="font-medium text-foreground">Retour vers l’application FidexaPay…</p>
              <p>Si l’app ne s’ouvre pas automatiquement, utilisez le bouton ci-dessous.</p>
              <Button asChild className="w-full">
                <a href={deepLink}>Ouvrir FidexaPay</a>
              </Button>
            </>
          ) : (
            <p>Finalisation de la connexion Google…</p>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
