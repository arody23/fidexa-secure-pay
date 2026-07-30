import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Cookie } from 'lucide-react';
import { SITE } from '@/config/site';

const STORAGE_KEY = 'fidexapay_cookie_consent';

type Consent = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  ts: number;
};

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) setVisible(true);
  }, []);

  const save = (a: boolean, m: boolean) => {
    const consent: Consent = { essential: true, analytics: a, marketing: m, ts: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 p-5 shadow-2xl backdrop-blur-xl md:p-6">
        <div className="flex items-start gap-3">
          <Cookie className="mt-1 h-6 w-6 shrink-0 text-primary" />
          <div className="flex-1 space-y-3">
            <h3 className="font-semibold">Cookies & confidentialité</h3>
            <p className="text-sm text-muted-foreground">
              {SITE.name} utilise des cookies essentiels au fonctionnement et, avec votre accord, des cookies
              d&apos;analyse pour améliorer l&apos;expérience.{' '}
              <Link to={SITE.legal.cookies} className="text-primary underline-offset-2 hover:underline">
                En savoir plus
              </Link>
            </p>

            {showSettings && (
              <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Essentiels (obligatoires)</Label>
                  <Switch checked disabled />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="analytics" className="text-sm">Analyse & performance</Label>
                  <Switch id="analytics" checked={analytics} onCheckedChange={setAnalytics} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="marketing" className="text-sm">Marketing</Label>
                  <Switch id="marketing" checked={marketing} onCheckedChange={setMarketing} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => save(true, true)}>
                Tout accepter
              </Button>
              <Button size="sm" variant="outline" onClick={() => save(false, false)}>
                Essentiels uniquement
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSettings((v) => !v)}>
                {showSettings ? 'Masquer' : 'Personnaliser'}
              </Button>
              {showSettings && (
                <Button size="sm" variant="secondary" onClick={() => save(analytics, marketing)}>
                  Enregistrer
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
