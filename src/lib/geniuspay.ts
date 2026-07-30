import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config';
import { supabase } from '@/integrations/supabase/client';

const functionsUrl = `${SUPABASE_URL}/functions/v1`;

async function invokeFunction<T>(name: string, body: Record<string, unknown>, auth = false): Promise<T> {
  let authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  if (auth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      authorization = `Bearer ${session.access_token}`;
    }
  }

  const res = await fetch(`${functionsUrl}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
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

export interface CreateGeniusPayPaymentResponse {
  success: boolean;
  checkoutUrl: string;
  reference: string;
  amountXof: number;
  originalAmount: number;
  originalCurrency: string;
  fees?: number | null;
  environment?: string;
  alreadyPaid?: boolean;
  reused?: boolean;
}

export interface VerifyGeniusPayPaymentResponse {
  success: boolean;
  status?: string;
  reference?: string;
  alreadyPaid?: boolean;
  pending?: boolean;
}

export async function createGeniusPayPayment(params: {
  linkId: string;
  customerName?: string;
  customerEmail?: string;
  origin?: string;
  forceNew?: boolean;
}): Promise<CreateGeniusPayPaymentResponse> {
  return invokeFunction('geniuspay-create-payment', {
    ...params,
    origin: params.origin ?? window.location.origin,
  });
}

export async function verifyGeniusPayPayment(
  linkId: string,
  reference?: string
): Promise<VerifyGeniusPayPaymentResponse> {
  return invokeFunction('geniuspay-verify-payment', { linkId, reference });
}

export interface CreateGeniusPayPayoutResponse {
  success: boolean;
  reference: string;
  payoutStatus: string;
  withdrawalStatus: string;
  amountXof: number;
  originalAmount: number;
  originalCurrency: string;
  fees?: number | null;
  provider?: string;
  phone?: string;
  reused?: boolean;
}

export async function createGeniusPayPayout(withdrawalId: string): Promise<CreateGeniusPayPayoutResponse> {
  return invokeFunction('geniuspay-create-payout', { withdrawalId }, true);
}

import { convertToXof } from '@/lib/currency';

/** Estimation indicative — GeniusPay applique sa propre conversion à l'encaissement. */
export function estimateGeniusPayXof(amount: number, currency?: string | null): number {
  return convertToXof(amount, currency);
}
