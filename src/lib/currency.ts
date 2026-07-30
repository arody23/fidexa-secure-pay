const CURRENCY_LABELS: Record<string, string> = {
  XOF: 'FCFA',
  FCFA: 'FCFA',
  XAF: 'FCFA',
  USD: 'USD',
  EUR: 'EUR',
  CDF: 'CDF',
  GBP: 'GBP',
};

/**
 * Taux mid-market internationaux : unités de devise pour 1 USD.
 * Source : parité marché (USD pivot) — aligné GeniusPay côté serveur.
 */
export const UNITS_PER_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  /** Taux marché ~ Juillet 2026 (indicatif UI uniquement — GeniusPay convertit à l'encaissement) */
  XOF: 571.85,
  XAF: 571.85,
  FCFA: 571.85,
  CDF: 2850,
};

/** @deprecated Utiliser UNITS_PER_USD */
export const EXCHANGE_RATES_TO_USD: Record<string, number> = Object.fromEntries(
  Object.entries(UNITS_PER_USD).map(([k, v]) => [k, 1 / v])
);

export function normalizeCurrencyCode(currency?: string | null): string {
  if (!currency) return 'FCFA';
  const raw = String(currency).trim().toUpperCase();
  const token = raw.split(/[\s|/,_-]+/)[0] || raw;
  if (token === 'XOF' || token === 'XAF' || token === 'FCFA') return 'FCFA';
  if (UNITS_PER_USD[token] || CURRENCY_LABELS[token]) return token;
  for (const code of Object.keys(UNITS_PER_USD)) {
    if (raw.includes(code)) {
      if (code === 'XOF' || code === 'XAF') return 'FCFA';
      return code;
    }
  }
  return 'FCFA';
}

export function normalizeCurrency(currency?: string | null): string {
  return normalizeCurrencyCode(currency);
}

export function getCurrencyLabel(currency?: string | null): string {
  const code = normalizeCurrencyCode(currency);
  if (code === 'CDF') return 'CDF';
  if (code === 'USD' || code === 'EUR' || code === 'GBP') return code;
  if (code === 'FCFA') return 'FCFA';
  return CURRENCY_LABELS[code] ?? code;
}

function currencyKey(currency?: string | null): string {
  return normalizeCurrencyCode(currency);
}

export function getExchangeRate(currency?: string | null): number {
  const key = currencyKey(currency);
  const units = UNITS_PER_USD[key] ?? UNITS_PER_USD.USD;
  return 1 / units;
}

export function convertToUSD(amount: number, currency?: string | null): number {
  const key = currencyKey(currency);
  const units = UNITS_PER_USD[key] ?? UNITS_PER_USD.USD;
  return Number(amount) / units;
}

/** Estimation indicative XOF — la conversion réelle est faite par GeniusPay (USD/EUR/CDF). */
export function convertToXof(amount: number, currency?: string | null): number {
  const from = normalizeCurrencyCode(currency);
  const n = Number(amount);

  if (from === 'FCFA') {
    return Math.max(200, Math.round(n));
  }

  const fromUnits = UNITS_PER_USD[from] ?? UNITS_PER_USD.USD;
  const usd = n / fromUnits;
  return Math.max(200, Math.round(usd * UNITS_PER_USD.XOF));
}

export function formatUSD(amount: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatAmount(
  amount: number,
  currency?: string | null,
  locale = 'fr-FR'
): string {
  const label = getCurrencyLabel(currency);
  const formatted = Number(amount).toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: label === 'USD' || label === 'EUR' ? 2 : 0,
  });
  return `${formatted} ${label}`;
}

export function formatAmountWithUSD(
  amount: number,
  currency?: string | null,
  locale = 'fr-FR'
): { original: string; usd: string; usdValue: number } {
  const usdValue = convertToUSD(amount, currency);
  return {
    original: formatAmount(amount, currency, locale),
    usd: formatUSD(usdValue),
    usdValue,
  };
}

export function commissionToUSD(
  amount: number,
  currency?: string | null,
  rate = 0.05
): number {
  return convertToUSD(amount * rate, currency);
}

/** Affichage indicatif XOF — la conversion finale est faite par GeniusPay. */
export function formatGeniusPayEstimate(amount: number, currency?: string | null): string {
  const xof = convertToXof(amount, currency);
  return `${xof.toLocaleString('fr-FR')} FCFA`;
}
