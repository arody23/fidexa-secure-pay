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

export interface CreateKPayPaymentResponse {
  success: boolean;
  checkoutUrl?: string;
  reference: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  provider?: string;
  paymentMode?: 'gateway' | 'ussd';
  originalAmount?: number;
  originalCurrency?: string;
  fees?: number | null;
  environment?: string;
  alreadyPaid?: boolean;
  reused?: boolean;
}

export interface VerifyKPayPaymentResponse {
  success: boolean;
  status?: string;
  reference?: string;
  alreadyPaid?: boolean;
  pending?: boolean;
}

export async function createKPayPayment(params: {
  linkId: string;
  customerName?: string;
  customerEmail?: string;
  origin?: string;
  forceNew?: boolean;
}): Promise<CreateKPayPaymentResponse> {
  return invokeFunction('kpay-create-payment', {
    ...params,
    origin: params.origin ?? window.location.origin,
  });
}

export async function verifyKPayPayment(
  linkId: string,
  opts?: { paymentId?: string; reference?: string }
): Promise<VerifyKPayPaymentResponse> {
  return invokeFunction('kpay-verify-payment', {
    linkId,
    paymentId: opts?.paymentId,
    reference: opts?.reference,
  });
}

export interface CreateKPayPayoutResponse {
  success: boolean;
  reference: string;
  paymentId?: string;
  payoutStatus: string;
  withdrawalStatus: string;
  amount?: number;
  originalAmount?: number;
  originalCurrency?: string;
  fees?: number | null;
  provider?: string;
  phone?: string;
  reused?: boolean;
}

export async function createKPayPayout(withdrawalId: string): Promise<CreateKPayPayoutResponse> {
  return invokeFunction('kpay-create-payout', { withdrawalId }, true);
}
