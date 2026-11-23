import { useEffect, useState, type ReactNode } from 'react';
import {
  BellRing,
  ChevronRight,
  Clock3,
  EyeOff,
  Fingerprint,
  History,
  LockKeyhole,
  MonitorSmartphone,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSecurity } from '@/contexts/AppSecurityContext';
import { getCurrentDeviceSummary, isNativeSecurityAvailable, type CurrentDeviceSummary } from '@/lib/appSecurity';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#eef3f9] px-4 py-3.5 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eef4ff] text-[#0b3b78]">
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0b2f63]">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#7a8fa6]">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SecurityPrivacy() {
  const { user } = useAuth();
  const {
    settings,
    biometry,
    events,
    updateSettings,
    setPin,
    disablePin,
    lockNow,
    recordSecurityEvent,
  } = useAppSecurity();
  const [device, setDevice] = useState<CurrentDeviceSummary | null>(null);
  const [pin, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinMessage, setPinMessage] = useState('');

  useEffect(() => {
    void getCurrentDeviceSummary().then(setDevice).catch(() => undefined);
  }, []);

  const nativeBiometryAvailable = isNativeSecurityAvailable() && Boolean(biometry?.isAvailable);

  async function savePin() {
    if (pin.length !== 6 || pinConfirm.length !== 6) {
      setPinMessage('Saisissez un code PIN de 6 chiffres.');
      return;
    }
    if (pin !== pinConfirm) {
      setPinMessage('Les deux codes PIN ne correspondent pas.');
      return;
    }
    await setPin(pin);
    setPinValue('');
    setPinConfirm('');
    setPinMessage('Code PIN activé.');
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 overflow-x-hidden">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-[#8a9bb0]">
          Paramètres finance
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-[#0b2f63] sm:text-2xl">
          Sécurité et confidentialité
        </h1>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e2eaf3] bg-white shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
        <div className="border-b border-[#eef3f9] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#0b2f63]">Protection de l'application</h2>
        </div>
        <SettingRow
          icon={Fingerprint}
          title="Déverrouillage biométrique"
          description={
            nativeBiometryAvailable
              ? 'Empreinte, visage ou identifiant appareil au lancement et à la reprise.'
              : 'Disponible dans l’application Android si la biométrie est configurée.'
          }
        >
          <Switch
            checked={settings.biometricUnlock}
            disabled={!nativeBiometryAvailable}
            onCheckedChange={async (checked) => {
              await updateSettings({ biometricUnlock: checked });
              await recordSecurityEvent(
                checked ? 'Déverrouillage biométrique activé' : 'Déverrouillage biométrique désactivé'
              );
            }}
          />
        </SettingRow>
        <div className="border-b border-[#eef3f9] px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eef4ff] text-[#0b3b78]">
              <LockKeyhole className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0b2f63]">Code PIN 6 chiffres</p>
                  <p className="mt-0.5 text-xs text-[#7a8fa6]">Définir, changer ou désactiver le fallback app.</p>
                </div>
                {settings.pinEnabled && (
                  <Button variant="outline" size="sm" onClick={disablePin}>
                    Désactiver
                  </Button>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-[#5c7188]">Nouveau PIN</Label>
                  <InputOTP
                    maxLength={6}
                    value={pin}
                    onChange={(value) => setPinValue(value.replace(/\D/g, ''))}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} className="h-10 w-9" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#5c7188]">Confirmer</Label>
                  <InputOTP
                    maxLength={6}
                    value={pinConfirm}
                    onChange={(value) => setPinConfirm(value.replace(/\D/g, ''))}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} className="h-10 w-9" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button onClick={savePin} className="bg-[#0b3b78] hover:bg-[#0a3266]">
                  {settings.pinEnabled ? 'Changer le PIN' : 'Activer le PIN'}
                </Button>
                {pinMessage && <p className="text-sm text-[#5c7188]">{pinMessage}</p>}
              </div>
            </div>
          </div>
        </div>
        <SettingRow
          icon={Clock3}
          title="Verrouillage automatique"
          description="Délai avant verrouillage après mise en arrière-plan."
        >
          <Select
            value={settings.autoLockDelay}
            onValueChange={(value) => updateSettings({ autoLockDelay: value as typeof settings.autoLockDelay })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immédiat</SelectItem>
              <SelectItem value="30s">30 s</SelectItem>
              <SelectItem value="1m">1 min</SelectItem>
              <SelectItem value="5m">5 min</SelectItem>
              <SelectItem value="never">Jamais</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <div className="px-4 py-3">
          <Button variant="outline" className="w-full justify-between" onClick={lockNow}>
            Verrouiller maintenant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e2eaf3] bg-white shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
        <div className="border-b border-[#eef3f9] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#0b2f63]">Sécurité du compte</h2>
        </div>
        <div className="border-b border-[#eef3f9] px-4 py-3.5">
          <div className="flex items-start gap-3">
            <MonitorSmartphone className="mt-1 h-4 w-4 shrink-0 text-[#0b3b78]" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0b2f63]">Appareils connectés</p>
              <p className="mt-1 text-xs text-[#7a8fa6]">
                {device ? `${device.name} · ${device.model} · ${device.platform}` : 'Appareil actuel'}
              </p>
              <p className="mt-1 text-xs text-[#7a8fa6]">
                Dernière connexion :{' '}
                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('fr-FR') : 'session actuelle'}
              </p>
              <p className="mt-1 text-[11px] text-[#9aabbd]">
                Gestion avancée prête pour une table `user_devices` si elle est ajoutée plus tard.
              </p>
            </div>
          </div>
        </div>
        <SettingRow
          icon={History}
          title="Historique de sécurité"
          description={events.length > 0 ? `${events.length} évènement(s) récents sur cet appareil.` : 'Aucun évènement récent.'}
        >
          <span className="text-xs font-medium text-[#5c7188]">Local</span>
        </SettingRow>
        {events.length > 0 && (
          <div className="space-y-2 border-b border-[#eef3f9] px-4 py-3">
            {events.slice(0, 4).map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-[#0b2f63]">{event.label}</span>
                <span className="shrink-0 text-[#8a9bb0]">
                  {new Date(event.createdAt).toLocaleString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        )}
        <SettingRow
          icon={BellRing}
          title="Alertes de sécurité"
          description="Recevoir les alertes d’activité suspecte quand l’infrastructure est disponible."
        >
          <Switch
            checked={settings.securityAlerts}
            onCheckedChange={(checked) => updateSettings({ securityAlerts: checked })}
          />
        </SettingRow>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e2eaf3] bg-white shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
        <div className="border-b border-[#eef3f9] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#0b2f63]">Confidentialité</h2>
        </div>
        <SettingRow
          icon={EyeOff}
          title="Masquer les informations sensibles"
          description="Floute les montants du tableau de bord, des retraits et de l’historique."
        >
          <Switch
            checked={settings.hideSensitiveInfo}
            onCheckedChange={(checked) => updateSettings({ hideSensitiveInfo: checked })}
          />
        </SettingRow>
        <SettingRow
          icon={BellRing}
          title="Notifications et aperçu des applications"
          description="Limiter les aperçus de notifications et d’écran quand l’app est verrouillée."
        >
          <Switch
            checked={settings.hideNotificationPreviews}
            onCheckedChange={(checked) => updateSettings({ hideNotificationPreviews: checked })}
          />
        </SettingRow>
        <SettingRow
          icon={ShieldCheck}
          title="Confirmation des opérations"
          description="Protéger les retraits et opérations sensibles par biométrie ou PIN."
        >
          <Switch
            checked={settings.protectSensitiveActions}
            onCheckedChange={(checked) => updateSettings({ protectSensitiveActions: checked })}
          />
        </SettingRow>
      </section>
    </div>
  );
}
