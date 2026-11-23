import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_PUBLIC_URL } from '@/config/site';
import { isNativeApp, openExternalUrl } from '@/lib/native';

/**
 * Android app is provider-only. Client paths (/pay, /order, /avis) open on the public web.
 */
export default function NativeClientLinkGate() {
  const location = useLocation();
  const webUrl = `${APP_PUBLIC_URL}${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (!isNativeApp()) return;
    void openExternalUrl(webUrl);
  }, [webUrl]);

  if (!isNativeApp()) return null;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#f4f5f7] px-6 text-center">
      <p className="max-w-sm text-sm text-slate-600">
        Cet espace est réservé aux clients sur le site web. L’app FidexaPay est destinée aux prestataires.
      </p>
      <Button type="button" className="gap-2" onClick={() => void openExternalUrl(webUrl)}>
        <ExternalLink className="h-4 w-4" />
        Ouvrir dans le navigateur
      </Button>
      <Button asChild variant="outline">
        <Link to="/auth/signin">Espace prestataire</Link>
      </Button>
    </div>
  );
}
