import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config';
import { supabase } from '@/integrations/supabase/client';

/**
 * Par défaut → Edge admin-notify-proxy → Railway.
 * Option local : VITE_NOTIFY_LOCAL=true → proxy Vite → localhost:3099.
 */
async function invoke(action: string, body: Record<string, unknown> = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Session admin requise');

  const useLocalProxy = import.meta.env.DEV && import.meta.env.VITE_NOTIFY_LOCAL === 'true';
  const url = useLocalProxy
    ? '/__notify-admin'
    : `${SUPABASE_URL}/functions/v1/admin-notify-proxy`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
  if (!useLocalProxy) {
    headers.apikey = SUPABASE_ANON_KEY ?? '';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erreur ${action}`);
  return data;
}

export const adminNotify = {
  overview: () => invoke('overview'),
  whatsapp: () => invoke('whatsapp'),
  reconnect: () => invoke('reconnect'),
  logout: () => invoke('logout'),
  logs: (limit = 50) => invoke('logs', { limit }),
  templateTest: (eventType: string, recipientPhone: string, variables?: Record<string, string>) =>
    invoke('template-test', { eventType, recipientPhone, variables }),
};
