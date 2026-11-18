import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  checkOrderAccessSession,
  getOrderAccessStatus,
  requestOrderOtp,
  verifyOrderOtp,
} from '@/lib/orderAccess';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

interface Props {
  linkId: string;
  children: React.ReactNode;
}

const OTP_LEN = 6;

/**
 * Gate OTP WhatsApp — écran type OTP dès l’arrivée (le code est déjà envoyé après paiement).
 * Vérifie automatiquement au 6ᵉ chiffre. Seul bouton visible : renvoyer le code.
 */
export default function OrderAccessGate({ linkId, children }: Props) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const verifyingRef = useRef(false);

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

  useEffect(() => {
    if (checking || unlocked) return;
    const t = window.setTimeout(() => inputsRef.current[0]?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [checking, unlocked]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const code = digits.join('');

  const clearDigits = () => {
    setDigits(Array(OTP_LEN).fill(''));
    inputsRef.current[0]?.focus();
  };

  const verify = async (fullCode: string) => {
    if (fullCode.length !== OTP_LEN || verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    setError('');
    try {
      await verifyOrderOtp(linkId, fullCode);
      setUnlocked(true);
      toast({ title: 'Accès autorisé', description: 'Suivi de commande déverrouillé.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Code incorrect';
      setError(msg);
      clearDigits();
      toast({ title: 'Code invalide', description: msg, variant: 'destructive' });
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  };

  const setDigitAt = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    // Paste / autofill multi-digit
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, OTP_LEN).split('');
      const next = Array(OTP_LEN).fill('');
      chars.forEach((c, i) => {
        next[i] = c;
      });
      setDigits(next);
      const focusAt = Math.min(chars.length, OTP_LEN - 1);
      inputsRef.current[focusAt]?.focus();
      if (chars.length >= OTP_LEN) void verify(chars.join('').slice(0, OTP_LEN));
      return;
    }

    setDigits((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      const joined = next.join('');
      if (joined.length === OTP_LEN && next.every(Boolean)) {
        queueMicrotask(() => void verify(joined));
      }
      return next;
    });
    if (index < OTP_LEN - 1) inputsRef.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigits((prev) => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        setDigits((prev) => {
          const next = [...prev];
          next[index - 1] = '';
          return next;
        });
      }
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < OTP_LEN - 1) inputsRef.current[index + 1]?.focus();
  };

  const resend = async () => {
    if (cooldown > 0 || sending) return;
    try {
      setSending(true);
      setError('');
      await requestOrderOtp(linkId);
      setCooldown(45);
      clearDigits();
      toast({
        title: 'Code renvoyé',
        description: maskedPhone
          ? `Nouveau code envoyé sur WhatsApp (${maskedPhone}).`
          : 'Nouveau code envoyé sur WhatsApp.',
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

  if (checking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b2f63]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#0b2f63]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.12),_transparent_55%)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-10">
        <div className="mb-10 flex justify-center [&_img]:brightness-0 [&_img]:invert">
          <Logo size="md" />
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)] sm:p-8">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b3b78]/10 text-[#0b3b78]">
            <MessageCircle className="h-6 w-6" strokeWidth={1.75} />
          </div>

          <h1 className="text-center text-xl font-semibold tracking-tight text-[#0b2f63]">
            Entrez le code
          </h1>
          <p className="mt-2 text-center text-sm leading-snug text-[#5c7188]">
            Un code à 6 chiffres a été envoyé sur WhatsApp
            {maskedPhone ? (
              <>
                {' '}
                <span className="font-semibold text-[#0b2f63]">{maskedPhone}</span>
              </>
            ) : (
              ' après votre paiement'
            )}
            .
          </p>

          <div className="mt-8 flex justify-center gap-2 sm:gap-2.5">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={OTP_LEN}
                value={d}
                disabled={verifying}
                aria-label={`Chiffre ${i + 1}`}
                onChange={(e) => setDigitAt(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className={cn(
                  'h-12 w-10 rounded-xl border-2 bg-[#f7fafd] text-center text-xl font-semibold tabular-nums text-[#0b2f63] outline-none transition sm:h-14 sm:w-11',
                  error
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-[#dbe6f2] focus:border-[#0b3b78] focus:bg-white',
                  verifying && 'opacity-60'
                )}
              />
            ))}
          </div>

          {verifying && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#5c7188]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Vérification…
            </div>
          )}

          {error && !verifying && (
            <p className="mt-4 text-center text-sm text-red-600">{error}</p>
          )}

          <Button
            type="button"
            variant="ghost"
            className="mt-6 h-11 w-full text-[#0b3b78] hover:bg-[#0b3b78]/5 hover:text-[#0b3b78]"
            onClick={resend}
            disabled={sending || cooldown > 0}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi…
              </>
            ) : cooldown > 0 ? (
              `Renvoyer dans ${cooldown}s`
            ) : (
              'Renvoyer le code'
            )}
          </Button>

          <p className="mt-3 text-center text-[11px] text-[#8a9bb0]">
            Code {code.length}/{OTP_LEN} · validation automatique
          </p>
        </div>
      </div>
    </div>
  );
}
