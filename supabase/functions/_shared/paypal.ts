const SANDBOX_API = 'https://api-m.sandbox.paypal.com';
const LIVE_API = 'https://api-m.paypal.com';

function readSecret(name: string): string | undefined {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  // Supabase Dashboard / copier-coller : guillemets ou espaces parasites
  return raw.trim().replace(/^["']|["']$/g, '');
}

/** Normalise PAYPAL_ENV (sandbox | live). Rejette les URLs par erreur. */
export function getPayPalApiBase(): string {
  const raw = (
    readSecret('PAYPAL_ENV') ??
    readSecret('PAYPAL_ENVIRONMENT') ??
    'sandbox'
  ).toLowerCase();

  if (raw.includes('sandbox')) return SANDBOX_API;
  if (raw === 'live' || raw === 'production' || raw.includes('api-m.paypal.com')) {
    return LIVE_API;
  }
  return SANDBOX_API;
}

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = readSecret('PAYPAL_CLIENT_ID');
  const clientSecret = readSecret('PAYPAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error(
      'PAYPAL_CLIENT_ID et PAYPAL_CLIENT_SECRET requis (Supabase → Edge Functions → Secrets)'
    );
  }

  const apiBase = getPayPalApiBase();
  const auth = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.text();
    const envHint = apiBase.includes('sandbox') ? 'sandbox' : 'live';
    throw new Error(
      `PayPal auth failed (${envHint}): ${err}. Vérifiez PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET et PAYPAL_ENV=sandbox dans Supabase Secrets (sans guillemets).`
    );
  }

  const data = await res.json();
  return data.access_token as string;
}

const RATES_TO_USD: Record<string, number> = {
  FCFA: 0.00165,
  XOF: 0.00165,
  XAF: 0.00165,
  CDF: 0.00036,
  EUR: 1.08,
  USD: 1,
  GBP: 1.27,
};
const EUR_TO_USD = 1.08;

function normalizeCurrencyCode(currency?: string | null): string {
  const c = (currency || 'FCFA').toUpperCase();
  if (c === 'XOF' || c === 'XAF') return 'FCFA';
  return c;
}

/** Montant PayPal — sandbox FR : conversion locale → EUR (ou USD natif). */
export function amountForPayPal(
  amount: number,
  currency?: string | null
): { currency_code: string; value: string } {
  const c = normalizeCurrencyCode(currency);
  if (c === 'EUR') {
    return { currency_code: 'EUR', value: Number(amount).toFixed(2) };
  }
  if (c === 'USD') {
    return { currency_code: 'USD', value: Number(amount).toFixed(2) };
  }
  const rate = RATES_TO_USD[c] ?? RATES_TO_USD.FCFA;
  const eur = (Number(amount) * rate) / EUR_TO_USD;
  return { currency_code: 'EUR', value: Math.max(0.01, eur).toFixed(2) };
}

export async function resolveLinkCurrency(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: { currency?: string | null } | null }>;
        };
      };
    };
  },
  link: { currency?: string | null; provider_id?: string | null }
): Promise<string> {
  if (link.provider_id) {
    const { data: provider } = await supabase
      .from('users')
      .select('currency')
      .eq('id', link.provider_id)
      .maybeSingle();
    if (provider?.currency) return provider.currency;
  }
  return link.currency || 'FCFA';
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
