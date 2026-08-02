import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config';

const functionsUrl = `${SUPABASE_URL}/functions/v1`;

async function invoke(body: Record<string, unknown>) {
  const res = await fetch(`${functionsUrl}/order-client-access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur accès commande');
  return data;
}

export function orderAccessCookieName(linkId: string) {
  return `fidexa_order_${linkId}`;
}

export function getOrderAccessToken(linkId: string): string | null {
  if (typeof document === 'undefined') return null;
  const name = orderAccessCookieName(linkId);
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setOrderAccessToken(linkId: string, token: string, maxAgeSeconds: number) {
  const name = orderAccessCookieName(linkId);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(token)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}

export async function checkOrderAccessSession(linkId: string): Promise<boolean> {
  const sessionToken = getOrderAccessToken(linkId);
  if (!sessionToken) return false;
  const data = await invoke({ action: 'check-session', linkId, sessionToken });
  return !!data.valid;
}

export async function requestOrderOtp(linkId: string) {
  return invoke({ action: 'request-otp', linkId });
}

export async function verifyOrderOtp(linkId: string, code: string) {
  const data = await invoke({ action: 'verify', linkId, code });
  if (data.sessionToken) {
    setOrderAccessToken(linkId, data.sessionToken, data.maxAgeSeconds || 7 * 24 * 3600);
  }
  return data;
}

export async function getOrderAccessStatus(linkId: string) {
  return invoke({ action: 'status', linkId });
}
