import { createClient } from 'jsr:@supabase/supabase-js@2';
import { notifyUser } from './notify.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-geniuspay-signature, x-geniuspay-timestamp, x-geniuspay-event',
};

function readSecret(name: string): string | undefined {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  return raw.trim().replace(/^["']|["']$/g, '');
}

export function getGeniusPayBaseUrl(): string {
  return (
    readSecret('GENIUSPAY_BASE_URL') ??
    'https://geniuspay.ci/api/v1/merchant'
  ).replace(/\/$/, '');
}

export function getGeniusPayHeaders(): Record<string, string> {
  const apiKey = readSecret('GENIUSPAY_API_KEY');
  const apiSecret = readSecret('GENIUSPAY_API_SECRET');
  if (!apiKey || !apiSecret) {
    throw new Error(
      'GENIUSPAY_API_KEY et GENIUSPAY_API_SECRET requis (Supabase Edge Functions → Secrets)'
    );
  }
  return {
    'X-API-Key': apiKey,
    'X-API-Secret': apiSecret,
    'Content-Type': 'application/json',
  };
}

/**
 * Unités de devise pour 1 USD (pivot).
 * GeniusPay n'accepte que XOF/FCFA — une seule conversion ici vers XOF.
 * CDF ≈ 2850 / USD, XOF ≈ 605 / USD → 1 XOF ≈ 4,71 CDF.
 */
const UNITS_PER_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  XOF: 605,
  XAF: 605,
  FCFA: 605,
  CDF: 2850,
};

const KNOWN_CURRENCIES = new Set(Object.keys(UNITS_PER_USD));

/** Extrait un code devise connu (ex. "CDF — Franc" → CDF). */
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
  console.warn('[GeniusPay] devise inconnue, fallback FCFA:', currency);
  return 'FCFA';
}

/**
 * Une seule conversion vers XOF pour GeniusPay (devise API = XOF).
 * FCFA/XOF/XAF → montant inchangé. Autres devises → via USD pivot.
 */
export function amountForGeniusPay(
  amount: number,
  currency?: string | null
): {
  amountXof: number;
  originalAmount: number;
  originalCurrency: string;
  rateUsed: string;
} {
  const originalCurrency = normalizeCurrencyCode(currency);
  const n = Number(amount);

  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Montant invalide pour GeniusPay: ${amount}`);
  }

  if (originalCurrency === 'FCFA') {
    const amountXof = Math.max(200, Math.round(n));
    console.log('[GeniusPay] conversion', {
      originalAmount: n,
      originalCurrency,
      rateUsed: '1:1 (FCFA/XOF)',
      amountXof,
    });
    return { amountXof, originalAmount: n, originalCurrency, rateUsed: '1:1' };
  }

  const fromUnits = UNITS_PER_USD[originalCurrency];
  if (!fromUnits) {
    throw new Error(`Taux manquant pour devise ${originalCurrency}`);
  }
  const usd = n / fromUnits;
  const amountXof = Math.max(200, Math.round(usd * UNITS_PER_USD.XOF));
  const rateUsed = `${originalCurrency}->USD(/${fromUnits})->XOF(*${UNITS_PER_USD.XOF})`;
  console.log('[GeniusPay] conversion', {
    originalAmount: n,
    originalCurrency,
    usd,
    rateUsed,
    amountXof,
  });
  return { amountXof, originalAmount: n, originalCurrency, rateUsed };
}

/** Devise du lien d'abord (source de vérité du paiement), sinon profil prestataire. */
export async function resolveLinkCurrency(
  supabase: ReturnType<typeof createClient>,
  link: { currency?: string | null; provider_id?: string | null }
): Promise<string> {
  if (link.currency) {
    const fromLink = normalizeCurrencyCode(link.currency);
    console.log('[GeniusPay] currency from payment_links:', link.currency, '→', fromLink);
    return fromLink;
  }
  if (link.provider_id) {
    const { data: provider } = await supabase
      .from('users')
      .select('currency')
      .eq('id', link.provider_id)
      .maybeSingle();
    if (provider?.currency) {
      const fromProvider = normalizeCurrencyCode(provider.currency);
      console.log('[GeniusPay] currency from provider:', provider.currency, '→', fromProvider);
      return fromProvider;
    }
  }
  console.warn('[GeniusPay] currency fallback FCFA');
  return 'FCFA';
}

export async function verifyWebhookSignature(payload: string, signature: string | null): Promise<boolean> {
  const webhookSecret =
    readSecret('GENIUSPAY_WEBHOOK_SECRET') ?? readSecret('GENIUSPAY_API_SECRET');
  if (!webhookSecret) {
    console.warn('GENIUSPAY_WEBHOOK_SECRET non configuré — skip verify en dev');
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
  return expected === normalized;
}

export async function markLinkPaid(
  supabase: ReturnType<typeof createClient>,
  linkDbId: string,
  opts: {
    reference: string;
    geniuspayPaymentId?: number | null;
    status?: string;
    fees?: number | null;
    netAmount?: number | null;
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
      payment_method: 'geniuspay',
      geniuspay_reference: opts.reference,
      geniuspay_payment_id: opts.geniuspayPaymentId ?? null,
      geniuspay_status: opts.status ?? 'completed',
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
    description: `Paiement GeniusPay confirmé (${opts.reference}${opts.gateway ? ` · ${opts.gateway}` : ''})`,
    actor_type: 'client',
  });

  if (timelineError) {
    console.warn('order_timeline insert skipped:', timelineError.message);
  }
}

export async function fetchGeniusPayPayment(reference: string) {
  const res = await geniusPayFetch(`/payments/${encodeURIComponent(reference)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `GeniusPay GET payment failed (${res.status})`);
  }
  return data;
}

/** Requête GeniusPay avec repli Bearer si 401 (payout API). */
export async function geniusPayFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = getGeniusPayBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  let res = await fetch(url, {
    ...init,
    headers: { ...getGeniusPayHeaders(), ...(init.headers as Record<string, string>) },
  });
  if (res.status === 401) {
    const apiKey = readSecret('GENIUSPAY_API_KEY');
    if (apiKey) {
      res = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(init.headers as Record<string, string>),
        },
      });
    }
  }
  return res;
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

/** Mappe le libellé UI FidexaPay vers le code provider GeniusPay. */
export function mapMobileMoneyProviderToGeniusPay(providerName: string): string {
  const n = providerName.toLowerCase();
  if (n.includes('orange')) return 'orange_money';
  if (n.includes('wave')) return 'wave';
  if (n.includes('moov')) return 'moov';
  if (n.includes('airtel')) return 'airtel';
  if (n.includes('m-pesa') || n.includes('mpesa')) return 'mpesa';
  if (n.includes('vodafone')) return 'vodafone';
  if (n.includes('free')) return 'free';
  if (n.includes('mtn')) return 'mtn';
  return 'mtn';
}

export interface GeniusPayWallet {
  id: string;
  currency?: string;
  type?: string;
  status?: string;
  available_balance?: number;
}

export async function fetchGeniusPayPayoutWallet(): Promise<GeniusPayWallet> {
  const configured = readSecret('GENIUSPAY_PAYOUT_WALLET_ID');
  if (configured) {
    return { id: configured };
  }

  const res = await geniusPayFetch('/wallets');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `GeniusPay wallets failed (${res.status})`);
  }

  const wallets: GeniusPayWallet[] = data.data?.wallets ?? data.wallets ?? [];
  const payoutWallet =
    wallets.find((w) => w.type === 'payout' && w.status === 'active') ??
    wallets.find((w) => w.status === 'active') ??
    wallets[0];

  if (!payoutWallet?.id) {
    throw new Error(
      'Aucun wallet payout GeniusPay trouvé. Configurez GENIUSPAY_PAYOUT_WALLET_ID dans Supabase Secrets.'
    );
  }
  return payoutWallet;
}

export interface CreateGeniusPayPayoutParams {
  walletId: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string | null;
  provider: string;
  account: string;
  amountXof: number;
  description: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export async function createGeniusPayPayout(params: CreateGeniusPayPayoutParams) {
  const payload = {
    wallet_id: params.walletId,
    recipient: {
      name: params.recipientName,
      phone: params.recipientPhone,
      email: params.recipientEmail || undefined,
    },
    destination: {
      type: 'mobile_money',
      provider: params.provider,
      account: params.account,
    },
    amount: params.amountXof,
    currency: 'XOF',
    description: params.description.slice(0, 500),
    idempotency_key: params.idempotencyKey,
    metadata: params.metadata ?? {},
  };

  const res = await geniusPayFetch('/payouts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const detail =
      data.message || data.error || data.errors?.[0]?.message || `GeniusPay payout failed (${res.status})`;
    throw new Error(detail);
  }
  return data.data?.payout ?? data.payout ?? data.data ?? data;
}

export async function fetchGeniusPayPayout(reference: string) {
  const res = await geniusPayFetch(`/payouts/${encodeURIComponent(reference)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `GeniusPay GET payout failed (${res.status})`);
  }
  return data.data?.payout ?? data.payout ?? data.data ?? data;
}

export async function applyWithdrawalPayoutUpdate(
  supabase: ReturnType<typeof createClient>,
  withdrawalId: string,
  opts: {
    reference: string;
    payoutId?: string | null;
    status: string;
    fees?: number | null;
    amountXof?: number | null;
    adminId?: string | null;
    notifyMessage?: string;
    finalStatus?: 'processing' | 'completed' | 'failed';
  }
) {
  const gpStatus = opts.status.toLowerCase();
  const finalStatus =
    opts.finalStatus ??
    (gpStatus === 'completed' || gpStatus === 'success'
      ? 'completed'
      : gpStatus === 'failed' || gpStatus === 'cancelled'
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
      payout_mode: 'geniuspay',
      geniuspay_payout_reference: opts.reference,
      geniuspay_payout_id: opts.payoutId ?? null,
      geniuspay_payout_status: gpStatus,
      geniuspay_payout_fees: opts.fees ?? null,
      geniuspay_amount_xof: opts.amountXof ?? null,
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
