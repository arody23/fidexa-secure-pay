import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { App } from '@capacitor/app';
import type { CheckBiometryResult } from '@aparajita/capacitor-biometric-auth';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_SECURITY_SETTINGS,
  addSecurityEvent,
  authenticateWithBiometry,
  getAutoLockDelayMs,
  getBiometryInfo,
  hasPinHash,
  loadSecurityEvents,
  loadSecuritySettings,
  removePinHash,
  saveSecuritySettings,
  setPinHash,
  verifyPin,
  type AppSecuritySettings,
  type SecurityEvent,
} from '@/lib/appSecurity';

interface AppSecurityContextType {
  settings: AppSecuritySettings;
  locked: boolean;
  ready: boolean;
  biometry: CheckBiometryResult | null;
  events: SecurityEvent[];
  updateSettings: (patch: Partial<AppSecuritySettings>) => Promise<void>;
  unlockWithBiometry: () => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  disablePin: () => Promise<void>;
  lockNow: () => void;
  recordSecurityEvent: (label: string) => Promise<void>;
  requireSensitiveUnlock: () => Promise<boolean>;
}

const AppSecurityContext = createContext<AppSecurityContextType | undefined>(undefined);

export function AppSecurityProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<AppSecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [biometry, setBiometry] = useState<CheckBiometryResult | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const lastBackgroundAt = useRef<number | null>(null);

  const userId = user?.id ?? null;

  const shouldLock = useCallback(
    async (currentSettings = settings) => {
      if (!userId) return false;
      if (currentSettings.pinEnabled) return hasPinHash(userId);
      if (currentSettings.biometricUnlock) return Boolean((await getBiometryInfo())?.isAvailable);
      return false;
    },
    [settings, userId]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (authLoading) return;

      if (!userId) {
        setSettings(DEFAULT_SECURITY_SETTINGS);
        setEvents([]);
        setLocked(false);
        setReady(true);
        return;
      }

      setReady(false);
      const [storedSettings, storedEvents, biometricInfo] = await Promise.all([
        loadSecuritySettings(userId),
        loadSecurityEvents(userId),
        getBiometryInfo(),
      ]);

      if (cancelled) return;

      setSettings(storedSettings);
      setEvents(storedEvents);
      setBiometry(biometricInfo);
      setLocked(await shouldLock(storedSettings));
      setReady(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, shouldLock, userId]);

  useEffect(() => {
    if (!userId) return;

    const removeListeners: Array<() => void> = [];

    void App.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) {
        lastBackgroundAt.current = Date.now();
        return;
      }

      const nextBiometry = await getBiometryInfo();
      setBiometry(nextBiometry);

      const delay = getAutoLockDelayMs(settings.autoLockDelay);
      const elapsed = lastBackgroundAt.current ? Date.now() - lastBackgroundAt.current : 0;
      if (delay !== null && elapsed >= delay && (await shouldLock())) {
        setLocked(true);
      }
    }).then((handle) => removeListeners.push(() => void handle.remove()));

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lastBackgroundAt.current = Date.now();
        return;
      }
      const delay = getAutoLockDelayMs(settings.autoLockDelay);
      const elapsed = lastBackgroundAt.current ? Date.now() - lastBackgroundAt.current : 0;
      if (delay !== null && elapsed >= delay) {
        void shouldLock().then((mustLock) => {
          if (mustLock) setLocked(true);
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      removeListeners.forEach((remove) => remove());
    };
  }, [settings.autoLockDelay, shouldLock, userId]);

  const recordSecurityEvent = useCallback(
    async (label: string) => {
      if (!userId) return;
      setEvents(await addSecurityEvent(userId, label));
    },
    [userId]
  );

  const updateSettings = useCallback(
    async (patch: Partial<AppSecuritySettings>) => {
      if (!userId) return;
      const next = { ...settings, ...patch };
      setSettings(next);
      await saveSecuritySettings(userId, next);
    },
    [settings, userId]
  );

  const unlockWithBiometry = useCallback(async () => {
    try {
      await authenticateWithBiometry();
      setLocked(false);
      await recordSecurityEvent('Déverrouillage biométrique réussi');
      return true;
    } catch {
      return false;
    }
  }, [recordSecurityEvent]);

  const unlockWithPin = useCallback(
    async (pin: string) => {
      if (!userId) return false;
      const ok = await verifyPin(userId, pin);
      if (ok) {
        setLocked(false);
        await recordSecurityEvent('Déverrouillage par code PIN');
      }
      return ok;
    },
    [recordSecurityEvent, userId]
  );

  const setPin = useCallback(
    async (pin: string) => {
      if (!userId) return;
      await setPinHash(userId, pin);
      await updateSettings({ pinEnabled: true });
      await recordSecurityEvent('Code PIN FidexaPay mis à jour');
    },
    [recordSecurityEvent, updateSettings, userId]
  );

  const disablePin = useCallback(async () => {
    if (!userId) return;
    await removePinHash(userId);
    await updateSettings({ pinEnabled: false, biometricUnlock: false });
    await recordSecurityEvent('Code PIN désactivé');
  }, [recordSecurityEvent, updateSettings, userId]);

  const lockNow = useCallback(() => {
    void shouldLock().then((mustLock) => setLocked(mustLock));
  }, [shouldLock]);

  const requireSensitiveUnlock = useCallback(async () => {
    if (!settings.protectSensitiveActions) return true;
    if (settings.biometricUnlock && biometry?.isAvailable) {
      return unlockWithBiometry();
    }
    if (settings.pinEnabled) {
      setLocked(true);
      return false;
    }
    return true;
  }, [biometry?.isAvailable, settings, unlockWithBiometry]);

  const value = useMemo<AppSecurityContextType>(
    () => ({
      settings,
      locked,
      ready,
      biometry,
      events,
      updateSettings,
      unlockWithBiometry,
      unlockWithPin,
      setPin,
      disablePin,
      lockNow,
      recordSecurityEvent,
      requireSensitiveUnlock,
    }),
    [
      settings,
      locked,
      ready,
      biometry,
      events,
      updateSettings,
      unlockWithBiometry,
      unlockWithPin,
      setPin,
      disablePin,
      lockNow,
      recordSecurityEvent,
      requireSensitiveUnlock,
    ]
  );

  return <AppSecurityContext.Provider value={value}>{children}</AppSecurityContext.Provider>;
}

export function useAppSecurity() {
  const context = useContext(AppSecurityContext);
  if (!context) {
    throw new Error('useAppSecurity must be used within AppSecurityProvider');
  }
  return context;
}
