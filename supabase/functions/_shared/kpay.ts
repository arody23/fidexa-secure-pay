import { createClient } from 'jsr:@supabase/supabase-js@2';
import { notifyUser } from './notify.ts';
import { corsHeaders } from './cors.ts';
import { dispatchNotificationEvent } from './notifyDispatch.ts';

export { corsHeaders };

function readSecret(name: string): string | undefined {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  return raw.trim().replace(/^["']|["']$/g, '');
}

export function getKPayBaseUrl(): string {
  return (readSecret('KPAY_BASE_URL') ?? 'https://admin.kpay.site').replace(/\/$/, '');
}

export function getKPayHeaders(): Record<string, string> {
  const apiKey = readSecret('KPAY_API_KEY');
  const secretKey = readSecret('KPAY_SECRET_KEY');
  if (!apiKey || !secretKey) {
    throw new Error(
      'KPAY_API_KEY et KPAY_SECRET_KEY requis (Supabase Edge Functions → Secrets)'
    );
  }
  return {
    'X-API-Key': apiKey,
    'X-Secret-Key': secretKey,
    'Content-Type': 'application/json',
  };
}

/** Taux indicatifs pour convertir vers XAF (gateway / payout CFA). */
const UNITS_PER_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  XOF: 600,
  XAF: 600,
  FCFA: 600,
  CDF: 2294,
};

const KNOWN_CURRENCIES = new Set(Object.keys(UNITS_PER_USD));

export function normalizeCurrencyCode(currency?: string | null): string {
  const raw = String(currency || 'FCFA').trim().toUpperCase();
  if (!raw) return 'FCFA';
  const token = raw.split(/[\s|/,_-]+/)[0] || raw;
  if (token === 'XOF' || token === 'XAF' || token === 'FCFA') return 'FCFA';
  if (KNOWN_CURRENCIES.has(token)) return token;
  for (const code of KNOWN_CURRENCIES) {
    if (raw.includes(code)) {
      if (code === 'XOF' || code === 'XAF') return 'FCFA';
      return code;
    }
  }
  console.warn('[KPay] devise inconnue, fallback FCFA:', currency);
  return 'FCFA';
}

/**
 * Montant pour l'API KPay (GATEWAY / withdraw).
 * KPay déduit la devise du provider ; zone CFA → montant entier XAF/XOF 1:1.
 */
export function buildKPayAmount(
  amount: number,
  currency?: string | null,
  opts?: { minAmount?: number }
): {
  amount: number;
  settlementCurrency: string;
  originalAmount: number;
  originalCurrency: string;
  conversionMode: 'passthrough' | 'mapped-xaf' | 'converted-xaf';
} {
  const originalCurrency = normalizeCurrencyCode(currency);
  const n = Number(amount);
  const minAmount = opts?.minAmount ?? 50;

  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Montant invalide pour KPay: ${amount}`);
  }

  if (originalCurrency === 'FCFA') {
    const amountApi = Math.max(minAmount, Math.round(n));
    return {
      amount: amountApi,
      settlementCurrency: 'XAF',
      originalAmount: n,
      originalCurrency,
      conversionMode: 'mapped-xaf',
    };
  }

  if (originalCurrency === 'CDF') {
    // CDF : envoyer tel quel (providers COD gèrent CDF)
    return {
      amount: Math.max(1, Math.round(n * 100) / 100),
      settlementCurrency: 'CDF',
      originalAmount: n,
      originalCurrency,
      conversionMode: 'passthrough',
    };
  }

  const fromUnits = UNITS_PER_USD[originalCurrency] ?? 1;
  const usd = n / fromUnits;
  const amountXaf = Math.max(minAmount, Math.round(usd * UNITS_PER_USD.XAF));
  return {
    amount: amountXaf,
    settlementCurrency: 'XAF',
    originalAmount: n,
    originalCurrency,
    conversionMode: 'converted-xaf',
  };
}

export async function resolveLinkCurrency(
  supabase: ReturnType<typeof createClient>,
  link: { currency?: string | null; provider_id?: string | null }
): Promise<string> {
  if (link.currency) {
    return normalizeCurrencyCode(link.currency);
  }
  if (link.provider_id) {
    const { data: provider } = await supabase
      .from('users')
      .select('currency')
      .eq('id', link.provider_id)
      .maybeSingle();
    if (provider?.currency) {
      return normalizeCurrencyCode(provider.currency);
    }
  }
  return 'FCFA';
}

export async function kpayFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = getKPayBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: { ...getKPayHeaders(), ...(init.headers as Record<string, string>) },
  });
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyWebhookSignature(
  payload: string,
  signature: string | null
): Promise<boolean> {
  const webhookSecret = readSecret('KPAY_WEBHOOK_SECRET') ?? readSecret('KPAY_SECRET_KEY');
  if (!webhookSecret) {
    console.warn('KPAY_WEBHOOK_SECRET non configuré — skip verify en dev');
    return true;
  }
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const normalized = signature.toLowerCase().replace(/^sha256=/, '');
  return timingSafeEqualHex(expected, normalized);
}

export async function markLinkPaid(
  supabase: ReturnType<typeof createClient>,
  linkDbId: string,
  opts: {
    reference: string;
    kpayPaymentId?: string | null;
    status?: string;
    fees?: number | null;
    gateway?: string | null;
  }
) {
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('payment_links')
    .update({
      is_paid: true,
      status: 'paid',
      order_status: 'paid',
      paid_at: now,
      payment_method: 'kpay',
      kpay_reference: opts.reference,
      kpay_payment_id: opts.kpayPaymentId ?? null,
      kpay_status: opts.status ?? 'COMPLETED',
      escrow_released: false,
      updated_at: now,
      expires_at: null,
    })
    .eq('id', linkDbId);

  if (updateError) throw new Error(`Mise à jour commande échouée: ${updateError.message}`);

  const { error: timelineError } = await supabase.from('order_timeline').insert({
    payment_link_id: linkDbId,
    status: 'paid',
    action: 'Paiement Mobile Money',
    description: `Paiement KPay confirmé (${opts.reference}${opts.gateway ? ` · ${opts.gateway}` : ''})`,
    actor_type: 'client',
  });

  if (timelineError) {
    console.warn('order_timeline insert skipped:', timelineError.message);
  }

  // Notifications + OTP — await obligatoire (sinon Edge coupe le fetch avant envoi)
  try {
    const { data: link } = await supabase
      .from('payment_links')
      .select(
        'id, link_id, amount, currency, client_name, client_email, client_phone, provider_id, description'
      )
      .eq('id', linkDbId)
      .maybeSingle();
    if (!link) return;

    let merchantName = 'Prestataire';
    if (link.provider_id) {
      const { data: provider } = await supabase
        .from('users')
        .select('full_name, phone')
        .eq('id', link.provider_id)
        .maybeSingle();
      if (provider?.full_name) merchantName = provider.full_name;
    }

    const appUrl = (Deno.env.get('APP_PUBLIC_URL') || 'https://fidexapay.com').replace(/\/$/, '');
    const trackingLink = `${appUrl}/order/${link.link_id}`;
    const paymentLink = `${appUrl}/pay/${link.link_id}`;
    const variables = {
      client_name: link.client_name || 'Client',
      merchant_name: merchantName,
      amount: String(link.amount ?? ''),
      currency: String(link.currency || 'FCFA'),
      order_reference: opts.reference || link.link_id,
      transaction_id: opts.kpayPaymentId || opts.reference || '',
      tracking_link: trackingLink,
      payment_link: paymentLink,
    };

    if (link.client_phone) {
      const clientResult = await dispatchNotificationEvent('payment.completed', {
        recipientPhone: link.client_phone,
        recipientEmail: link.client_email,
        clientPhone: link.client_phone,
        paymentLinkId: link.id,
        linkId: link.link_id,
        issueOrderOtp: true,
        variables,
      });
      console.log('[markLinkPaid] client notify', clientResult);
    } else {
      console.warn('[markLinkPaid] pas de client_phone — OTP/paiement WhatsApp ignorés');
    }

    if (link.provider_id) {
      const { data: provider } = await supabase
        .from('users')
        .select('phone, full_name')
        .eq('id', link.provider_id)
        .maybeSingle();
      if (provider?.phone) {
        const providerResult = await dispatchNotificationEvent('order.created', {
          recipientPhone: provider.phone,
          variables: { ...variables, merchant_name: provider.full_name || merchantName },
        });
        console.log('[markLinkPaid] provider notify', providerResult);
      }
    }
  } catch (err) {
    console.error('[markLinkPaid] notify dispatch error', err);
  }
}

export async function fetchKPayPayment(id: string) {
  const res = await kpayFetch(`/api/v1/payments/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `KPay GET payment failed (${res.status})`);
  }
  return data;
}

/** MSISDN KPay : chiffres internationaux sans + ni 0 initial national. */
export function normalizePhoneKPay(phone: string, defaultCountryDigits = '243'): string {
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) throw new Error('Numéro de téléphone invalide');

  // Déjà international (longueur typique >= 10 avec indicatif)
  if (digits.startsWith(defaultCountryDigits)) {
    return digits;
  }
  if (digits.startsWith('0')) {
    digits = defaultCountryDigits + digits.slice(1);
  } else if (digits.length <= 9) {
    digits = defaultCountryDigits + digits;
  }
  return digits;
}

export function normalizePhoneE164(phone: string, defaultPrefix = '+243'): string {
  const digits = String(phone).replace(/\D/g, '');
  if (String(phone).trim().startsWith('+')) {
    return `+${digits}`;
  }
  const prefixDigits = defaultPrefix.replace(/\D/g, '');
  if (digits.startsWith(prefixDigits)) {
    return `+${digits}`;
  }
  if (digits.startsWith('0')) {
    return `${defaultPrefix}${digits.slice(1)}`;
  }
  return `${defaultPrefix}${digits}`;
}

const ISO2_TO_ISO3: Record<string, string> = {
  BJ: 'BEN',
  CM: 'CMR',
  CI: 'CIV',
  CD: 'COD',
  GA: 'GAB',
  KE: 'KEN',
  CG: 'COG',
  RW: 'RWA',
  SN: 'SEN',
  SL: 'SLE',
  UG: 'UGA',
  ZM: 'ZMB',
};

const PHONE_PREFIX_DIGITS: Record<string, string> = {
  BJ: '229',
  CM: '237',
  CI: '225',
  CD: '243',
  GA: '241',
  KE: '254',
  CG: '242',
  RW: '250',
  SN: '221',
  SL: '232',
  UG: '256',
  ZM: '260',
};

/** Mappe pays ISO2 + libellé opérateur → code provider KPay exact. */
export function mapMobileMoneyProviderToKPay(
  providerName: string,
  countryIso2 = 'CD'
): string {
  const country = countryIso2.toUpperCase();
  const n = providerName.toLowerCase();

  if (n.includes('wave')) {
    throw new Error(
      'Wave est temporairement indisponible sur KPay. Choisissez MTN, Orange, Airtel ou un autre opérateur.'
    );
  }

  if (country === 'CD' || country === 'COD') {
    if (n.includes('vodacom') || n.includes('m-pesa') || n.includes('mpesa')) {
      return 'VODACOM_MPESA_COD';
    }
    if (n.includes('orange')) return 'ORANGE_COD';
    if (n.includes('airtel')) return 'AIRTEL_COD';
    return 'AIRTEL_COD';
  }

  if (country === 'CM' || country === 'CMR') {
    if (n.includes('orange')) return 'ORANGE_CMR';
    return 'MTN_MOMO_CMR';
  }

  if (country === 'CI' || country === 'CIV') {
    if (n.includes('orange')) return 'ORANGE_CIV';
    return 'MTN_MOMO_CIV';
  }

  if (country === 'CG' || country === 'COG') {
    if (n.includes('mtn')) return 'MTN_MOMO_COG';
    return 'AIRTEL_COG';
  }

  if (country === 'BJ' || country === 'BEN') {
    if (n.includes('moov')) return 'MOOV_BEN';
    return 'MTN_MOMO_BEN';
  }

  if (country === 'GA' || country === 'GAB') return 'AIRTEL_GAB';
  if (country === 'KE' || country === 'KEN') return 'MPESA_KEN';
  if (country === 'SN' || country === 'SEN') {
    if (n.includes('free')) return 'FREE_SEN';
    return 'ORANGE_SEN';
  }
  if (country === 'RW' || country === 'RWA') {
    if (n.includes('mtn')) return 'MTN_MOMO_RWA';
    return 'AIRTEL_RWA';
  }
  if (country === 'UG' || country === 'UGA') {
    if (n.includes('mtn')) return 'MTN_MOMO_UGA';
    return 'AIRTEL_OAPI_UGA';
  }
  if (country === 'ZM' || country === 'ZMB') {
    if (n.includes('zamtel')) return 'ZAMTEL_ZMB';
    if (n.includes('mtn')) return 'MTN_MOMO_ZMB';
    return 'AIRTEL_OAPI_ZMB';
  }

  // Défaut : RD Congo Airtel
  if (n.includes('orange')) return 'ORANGE_COD';
  if (n.includes('mtn')) return 'MTN_MOMO_CMR';
  return 'AIRTEL_COD';
}

export function countryIso2ToIso3(iso2: string): string {
  return ISO2_TO_ISO3[iso2.toUpperCase()] ?? 'COD';
}

export function phonePrefixDigitsForCountry(iso2: string): string {
  return PHONE_PREFIX_DIGITS[iso2.toUpperCase()] ?? '243';
}

export interface CreateKPayGatewayPaymentParams {
  amount: number;
  externalId: string;
  returnUrl: string;
  cancelUrl?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export async function createKPayGatewayPayment(params: CreateKPayGatewayPaymentParams) {
  const payload: Record<string, unknown> = {
    amount: params.amount,
    externalId: params.externalId,
    returnUrl: params.returnUrl,
    metadata: params.metadata ?? {},
  };
  if (params.cancelUrl) payload.cancelUrl = params.cancelUrl;
  if (params.description) payload.description = params.description.slice(0, 500);

  const res = await kpayFetch('/api/v1/payments/init', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const detail =
      data.message || data.error || `KPay payment init failed (${res.status})`;
    throw new Error(detail);
  }
  return data;
}

export interface CreateKPayPayoutParams {
  amount: number;
  provider: string;
  phoneNumber: string;
  externalId: string;
  description?: string;
  sourceCountry?: string;
  metadata?: Record<string, unknown>;
}

export async function createKPayPayout(params: CreateKPayPayoutParams) {
  const payload: Record<string, unknown> = {
    amount: params.amount,
    provider: params.provider,
    phoneNumber: params.phoneNumber,
    externalId: params.externalId,
    metadata: params.metadata ?? {},
  };
  if (params.description) payload.description = params.description.slice(0, 500);
  if (params.sourceCountry) payload.sourceCountry = params.sourceCountry;

  const res = await kpayFetch('/api/v1/payments/withdraw', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const detail =
      data.message || data.error || `KPay withdraw failed (${res.status})`;
    throw new Error(detail);
  }
  return data;
}

export async function fetchKPayPayout(id: string) {
  const res = await kpayFetch(`/api/v1/payments/withdraw/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `KPay GET withdraw failed (${res.status})`);
  }
  return data;
}

export async function applyWithdrawalPayoutUpdate(
  supabase: ReturnType<typeof createClient>,
  withdrawalId: string,
  opts: {
    reference: string;
    payoutId?: string | null;
    status: string;
    fees?: number | null;
    amount?: number | null;
    adminId?: string | null;
    notifyMessage?: string;
    finalStatus?: 'processing' | 'completed' | 'failed';
  }
) {
  const rawStatus = opts.status.toUpperCase();
  const finalStatus =
    opts.finalStatus ??
    (rawStatus === 'COMPLETED' || rawStatus === 'SUCCESS'
      ? 'completed'
      : rawStatus === 'FAILED' || rawStatus === 'CANCELLED'
      ? 'failed'
      : 'processing');

  const now = new Date().toISOString();
  const { data: withdrawal, error: fetchErr } = await supabase
    .from('withdrawals')
    .select('id, user_id, status')
    .eq('id', withdrawalId)
    .single();

  if (fetchErr || !withdrawal) {
    throw new Error('Retrait introuvable');
  }

  const { error: updateErr } = await supabase
    .from('withdrawals')
    .update({
      status: finalStatus,
      payout_mode: 'kpay',
      kpay_payout_reference: opts.reference,
      kpay_payout_id: opts.payoutId ?? null,
      kpay_payout_status: rawStatus.toLowerCase(),
      kpay_payout_fees: opts.fees ?? null,
      kpay_amount: opts.amount ?? null,
      processed_by: opts.adminId ?? null,
      processed_at: finalStatus === 'completed' || finalStatus === 'failed' ? now : null,
      updated_at: now,
    })
    .eq('id', withdrawalId);

  if (updateErr) throw new Error(updateErr.message);

  const message =
    opts.notifyMessage ??
    (finalStatus === 'completed'
      ? 'Votre retrait a été effectué sur votre compte Mobile Money.'
      : finalStatus === 'failed'
      ? 'Votre demande de retrait a échoué. Contactez le support.'
      : 'Votre retrait est en cours de traitement via Mobile Money.');

  await notifyUser(supabase, {
    user_id: withdrawal.user_id,
    title: 'Mise à jour retrait',
    message,
    type: 'withdrawal',
    link: '/dashboard/withdrawal',
  });

  return { finalStatus, userId: withdrawal.user_id };
}
