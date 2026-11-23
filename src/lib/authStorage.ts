import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Supabase auth storage.
 * Native: dual-write Preferences + localStorage so PKCE code_verifier is
 * available immediately when Custom Tabs return via deep link.
 * Web: localStorage only.
 */
const memory = new Map<string, string>();

export const authStorage = {
  async getItem(key: string): Promise<string | null> {
    if (memory.has(key)) return memory.get(key)!;

    if (!Capacitor.isNativePlatform()) {
      return localStorage.getItem(key);
    }

    try {
      const fromLs = localStorage.getItem(key);
      if (fromLs != null) {
        memory.set(key, fromLs);
        return fromLs;
      }
    } catch {
      /* ignore */
    }

    const { value } = await Preferences.get({ key });
    if (value != null) memory.set(key, value);
    return value;
  },

  async setItem(key: string, value: string): Promise<void> {
    memory.set(key, value);

    if (!Capacitor.isNativePlatform()) {
      localStorage.setItem(key, value);
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    await Preferences.set({ key, value });
  },

  async removeItem(key: string): Promise<void> {
    memory.delete(key);

    if (!Capacitor.isNativePlatform()) {
      localStorage.removeItem(key);
      return;
    }

    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    await Preferences.remove({ key });
  },
};
