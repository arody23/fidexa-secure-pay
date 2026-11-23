import { useEffect, useState } from 'react';
import { Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useAppSecurity } from '@/contexts/AppSecurityContext';

export default function AppLockOverlay() {
  const { locked, settings, biometry, unlockWithBiometry, unlockWithPin } = useAppSecurity();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!locked) {
      setPin('');
      setError('');
    }
  }, [locked]);

  useEffect(() => {
    if (pin.length !== 6) return;
    void handlePinUnlock(pin);
  }, [pin]);

  if (!locked) return null;

  const canUseBiometry = settings.biometricUnlock && biometry?.isAvailable;

  async function handleBiometricUnlock() {
    setBusy(true);
    setError('');
    const ok = await unlockWithBiometry();
    if (!ok) setError('Authentification annulée ou refusée.');
    setBusy(false);
  }

  async function handlePinUnlock(value: string) {
    setBusy(true);
    setError('');
    const ok = await unlockWithPin(value);
    if (!ok) {
      setError('Code PIN incorrect.');
      setPin('');
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center bg-[#071a33]/95 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="w-full max-w-sm rounded-[1.75rem] border border-white/10 bg-white p-5 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0b3b78] text-white shadow-[0_14px_30px_rgba(11,59,120,.28)]">
          <ShieldCheck className="h-7 w-7" strokeWidth={1.9} />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-[#0b2f63]">
          FidexaPay verrouillé
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5c7188]">
          Confirmez votre identité pour afficher vos informations financières.
        </p>

        {canUseBiometry && (
          <Button
            type="button"
            onClick={handleBiometricUnlock}
            disabled={busy}
            className="mt-5 h-11 w-full gap-2 bg-[#0b3b78] hover:bg-[#0a3266]"
          >
            <Fingerprint className="h-4 w-4" />
            Déverrouiller avec biométrie
          </Button>
        )}

        {settings.pinEnabled && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#5c7188]">
              <LockKeyhole className="h-3.5 w-3.5" />
              Code PIN 6 chiffres
            </div>
            <InputOTP
              maxLength={6}
              value={pin}
              onChange={(value) => setPin(value.replace(/\D/g, ''))}
              disabled={busy}
              containerClassName="justify-center"
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="h-11 w-10 border-[#dbe6f2] text-base"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
