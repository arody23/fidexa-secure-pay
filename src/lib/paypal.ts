import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config';

const functionsUrl = `${SUPABASE_URL}/functions/v1`;

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${functionsUrl}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${name}`);
  }
  return data as T;
}

export interface CreatePayPalOrderResponse {
  orderId: string;
  paypalAmount: { currency_code: string; value: string };
  originalAmount: number;
  currency: string;
}

export async function createPayPalOrder(linkId: string): Promise<CreatePayPalOrderResponse> {
  return invokeFunction('paypal-create-order', { linkId });
}

export async function capturePayPalOrder(
  orderId: string,
  linkId: string
): Promise<{ success: boolean; captureId?: string }> {
  return invokeFunction('paypal-capture-order', { orderId, linkId });
}

/** Client Supabase pour usages internes si besoin */
export const supabaseAnon = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
