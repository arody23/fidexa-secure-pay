import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { isPushSupported, subscribeToPush } from '@/lib/webPush';
import { useToast } from '@/hooks/use-toast';

const DISMISS_KEY = 'fidexapay_push_prompt_dismissed';

/** Popup fixe (style PWA) pour autoriser les notifications push VAPID */
export default function PushNotificationPrompt() {
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPushSupported() || localStorage.getItem(DISMISS_KEY)) return;
    if (Notification.permission !== 'default') return;

    const show = () => setVisible(true);

    const onPwaDismiss = () => {
      window.setTimeout(show, 1500);
    };

    window.addEventListener('fidexapay:pwa-dismissed', onPwaDismiss);

    const timer = window.setTimeout(show, 5000);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('fidexapay:pwa-dismissed', onPwaDismiss);
    };
  }, []);

  const enable = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ok = await subscribeToPush(user.id);
      if (ok) {
        setVisible(false);
        toast({ title: 'Notifications activées', description: 'Alertes push activées sur cet appareil.' });
      } else if (Notification.permission === 'denied') {
        toast({ title: 'Notifications refusées', description: 'Autorisez les notifications dans les paramètres du navigateur.', variant: 'destructive' });
      }
    } catch (err) {
      toast({
        title: 'Activation impossible',
        description: err instanceof Error ? err.message : 'Erreur push',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[89] md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
      <div className="rounded-xl border border-primary/30 bg-card p-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Activer les notifications
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Recevez les alertes commandes, paiements et retraits sur votre écran.
            </p>
          </div>
          <button type="button" onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1" onClick={enable} disabled={loading}>
            {loading ? 'Activation…' : 'Autoriser'}
          </Button>
          <Button size="sm" variant="outline" onClick={dismiss}>
            Plus tard
          </Button>
        </div>
      </div>
    </div>
  );
}
