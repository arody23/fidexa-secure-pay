import { useEffect, useRef, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SITE } from '@/config/site';

const DISMISS_KEY = 'fidexapay_pwa_prompt_dismissed';
const SESSION_DISMISS_KEY = 'fidexapay_pwa_prompt_session';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

/** Popup install PWA — s'affiche automatiquement sur le dashboard */
export default function PwaInstallPrompt() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [needsManual, setNeedsManual] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === 'permanent') return;
    if (sessionStorage.getItem(SESSION_DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setDeferred(e as BeforeInstallPromptEvent);
      setNeedsManual(false);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const autoTimer = window.setTimeout(() => {
      if (deferredRef.current || isStandalone()) return;
      // Android Chrome / iOS : afficher les instructions même sans beforeinstallprompt
      setNeedsManual(true);
      setVisible(true);
    }, 1800);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.clearTimeout(autoTimer);
    };
  }, []);

  const dismiss = (mode: 'session' | 'permanent' = 'session') => {
    if (mode === 'permanent') localStorage.setItem(DISMISS_KEY, 'permanent');
    else sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
    setVisible(false);
    window.dispatchEvent(new CustomEvent('fidexapay:pwa-dismissed'));
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss('permanent');
  };

  if (!visible) return null;

  const manualHint = isIos()
    ? "Sur iPhone : Partager (□↑) → « Sur l'écran d'accueil »."
    : isAndroid()
    ? "Sur Android Chrome : menu ⋮ → « Installer l'application » ou « Ajouter à l'écran d'accueil »."
    : "Ajoutez FidexaPay à votre écran d'accueil pour un accès rapide.";

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[90] md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
      <div className="rounded-xl border border-primary/30 bg-card p-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">Installer {SITE.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{manualHint}</p>
          </div>
          <button
            type="button"
            onClick={() => dismiss('permanent')}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {deferred && !needsManual ? (
            <Button size="sm" className="flex-1 gap-2" onClick={install}>
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
          ) : (
            <Button size="sm" className="flex-1 gap-2" onClick={() => dismiss('session')}>
              <Share className="h-4 w-4" />
              Compris
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => dismiss('session')}>
            Plus tard
          </Button>
        </div>
      </div>
    </div>
  );
}
