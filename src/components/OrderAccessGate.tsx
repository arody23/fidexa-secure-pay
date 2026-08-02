import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  checkOrderAccessSession,
  getOrderAccessStatus,
  requestOrderOtp,
  verifyOrderOtp,
} from '@/lib/orderAccess';
import Logo from '@/components/Logo';

interface Props {
  linkId: string;
  children: React.ReactNode;
}

/**
 * Protège la page de suivi après paiement.
 * OTP WhatsApp une fois, puis cookie de session (pas de redemande à chaque visite).
 */
export default function OrderAccessGate({ linkId, children }: Props) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const valid = await checkOrderAccessSession(linkId);
        if (cancelled) return;
        if (valid) {
          setUnlocked(true);
          return;
        }
        const status = await getOrderAccessStatus(linkId);
        if (cancelled) return;
        setMaskedPhone(status.maskedPhone || null);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkId]);

  const sendOtp = async () => {
    try {
      setSending(true);
      await requestOrderOtp(linkId);
      setOtpSent(true);
      toast({
        title: 'Code envoyé',
        description: maskedPhone
          ? `Un code a été envoyé sur WhatsApp (${maskedPhone}).`
          : 'Un code a été envoyé sur WhatsApp.',
      });
    } catch (err) {
      toast({
        title: 'Envoi impossible',
        description: err instanceof Error ? err.message : 'Réessayez',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    try {
      setVerifying(true);
      await verifyOrderOtp(linkId, code.trim());
      setUnlocked(true);
      toast({ title: 'Accès autorisé', description: 'Bienvenue sur le suivi de votre commande.' });
    } catch (err) {
      toast({
        title: 'Code invalide',
        description: err instanceof Error ? err.message : 'Vérifiez le code',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="mb-6">
        <Logo />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Vérification sécurisée
          </CardTitle>
          <CardDescription>
            Pour accéder au suivi de votre commande, entrez le code OTP envoyé sur WhatsApp
            {maskedPhone ? ` (${maskedPhone})` : ''}. Votre session restera active sur cet appareil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!otpSent && (
            <Button className="w-full" onClick={sendOtp} disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Recevoir le code WhatsApp
            </Button>
          )}

          {(otpSent || code) && (
            <>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Code à 6 chiffres"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <Button className="w-full" onClick={verify} disabled={verifying || code.length < 6}>
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vérifier et accéder
              </Button>
              <Button variant="ghost" className="w-full" onClick={sendOtp} disabled={sending}>
                Renvoyer le code
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
