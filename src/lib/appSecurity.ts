import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import {
  AndroidBiometryStrength,
  BiometricAuth,
  type CheckBiometryResult,
} from '@aparajita/capacitor-biometric-auth';

export type AutoLockDelay = 'immediate' | '30s' | '1m' | '5m' | 'never';

export interface AppSecuritySettings {
  biometricUnlock: boolean;
  pinEnabled: boolean;
  autoLockDelay: AutoLockDelay;
  hideSensitiveInfo: boolean;
  hideNotificationPreviews: boolean;
  protectSensitiveActions: boolean;
  securityAlerts: boolean;
}

export interface SecurityEvent {
  id: string;
  label: string;
  createdAt: string;
}

export interface CurrentDeviceSummary {
  name: string;
  model: string;
  platform: string;
  identifier: string;
}

export const DEFAULT_SECURITY_SETTINGS: AppSecuritySettings = {
  biometricUnlock: false,
  pinEnabled: false,
  autoLockDelay: '1m',
  hideSensitiveInfo: false,
  hideNotificationPreviews: true,
  protectSensitiveActions: true,
  securityAlerts: true,
};

const PREFIX = 'fidexa.security';

function scopedKey(userId: string, key: string) {
  return `${PREFIX}.${userId}.${key}`;
}

function delayMs(delay: AutoLockDelay): number | null {
  switch (delay) {
    case 'immediate':
      return 0;
    case '30s':
      return 30_000;
    case '1m':
      return 60_000;
    case '5m':
      return 300_000;
    case 'never':
      return null;
  }
}

export function getAutoLockDelayMs(delay: AutoLockDelay): number | null {
  return delayMs(delay);
}

export function isNativeSecurityAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function loadSecuritySettings(userId: string): Promise<AppSecuritySettings> {
  const { value } = await Preferences.get({ key: scopedKey(userId, 'settings') });
  if (!value) return DEFAULT_SECURITY_SETTINGS;

  try {
    return { ...DEFAULT_SECURITY_SETTINGS, ...(JSON.parse(value) as Partial<AppSecuritySettings>) };
  } catch {
    return DEFAULT_SECURITY_SETTINGS;
  }
}

export async function saveSecuritySettings(
  userId: string,
  settings: AppSecuritySettings
): Promise<void> {
  await Preferences.set({
    key: scopedKey(userId, 'settings'),
    value: JSON.stringify(settings),
  });
}

export async function getBiometryInfo(): Promise<CheckBiometryResult | null> {
  if (!isNativeSecurityAvailable()) return null;
  try {
    return await BiometricAuth.checkBiometry();
  } catch {
    return null;
  }
}

export async function authenticateWithBiometry(): Promise<void> {
  await BiometricAuth.authenticate({
    reason: 'Déverrouiller FidexaPay',
    cancelTitle: 'Annuler',
    allowDeviceCredential: true,
    iosFallbackTitle: 'Utiliser le code',
    androidTitle: 'Déverrouillage FidexaPay',
    androidSubtitle: 'Confirmez votre identité pour continuer',
    androidConfirmationRequired: false,
    androidBiometryStrength: AndroidBiometryStrength.weak,
  });
}

async function getDeviceBoundSalt(userId: string): Promise<string> {
  const randomSaltKey = scopedKey(userId, 'pin_salt');
  const existing = await Preferences.get({ key: randomSaltKey });
  if (existing.value) return existing.value;

  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const randomSalt = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const deviceId = await getDeviceIdentifier();
  const salt = `${deviceId}:${randomSalt}`;
  await Preferences.set({ key: randomSaltKey, value: salt });
  return salt;
}

async function getDeviceIdentifier(): Promise<string> {
  try {
    const id = await Device.getId();
    return id.identifier;
  } catch {
    return 'web-device';
  }
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const encoded = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function setPinHash(userId: string, pin: string): Promise<void> {
  const salt = await getDeviceBoundSalt(userId);
  const hash = await hashPin(pin, salt);
  await Preferences.set({ key: scopedKey(userId, 'pin_hash'), value: hash });
}

export async function hasPinHash(userId: string): Promise<boolean> {
  const { value } = await Preferences.get({ key: scopedKey(userId, 'pin_hash') });
  return Boolean(value);
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const [{ value: storedHash }, salt] = await Promise.all([
    Preferences.get({ key: scopedKey(userId, 'pin_hash') }),
    getDeviceBoundSalt(userId),
  ]);
  if (!storedHash) return false;
  return (await hashPin(pin, salt)) === storedHash;
}

export async function removePinHash(userId: string): Promise<void> {
  await Preferences.remove({ key: scopedKey(userId, 'pin_hash') });
}

export async function getCurrentDeviceSummary(): Promise<CurrentDeviceSummary> {
  const [info, id] = await Promise.all([Device.getInfo(), Device.getId()]);
  return {
    name: info.name || info.model || 'Cet appareil',
    model: info.model || 'Appareil actuel',
    platform: info.platform,
    identifier: id.identifier,
  };
}

export async function loadSecurityEvents(userId: string): Promise<SecurityEvent[]> {
  const { value } = await Preferences.get({ key: scopedKey(userId, 'events') });
  if (!value) return [];
  try {
    return JSON.parse(value) as SecurityEvent[];
  } catch {
    return [];
  }
}

export async function addSecurityEvent(userId: string, label: string): Promise<SecurityEvent[]> {
  const event: SecurityEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label,
    createdAt: new Date().toISOString(),
  };
  const next = [event, ...(await loadSecurityEvents(userId))].slice(0, 8);
  await Preferences.set({ key: scopedKey(userId, 'events'), value: JSON.stringify(next) });
  return next;
}
