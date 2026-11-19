// Mapping des pays africains + devises / mobile money
import { validateWithdrawalAmount } from '@/lib/withdrawalConfig';

export const COUNTRIES_DATA = {
  'CD': {
    name: 'Democratic Republic of Congo',
    nameFR: 'République Démocratique du Congo',
    code: 'CD',
    currency: 'CDF',
    currencyName: 'Franc Congolais',
    mobileMoneyProviders: [
      { name: 'Airtel Money', icon: '📱' },
      { name: 'M-Pesa', icon: '📱' },
      { name: 'Orange Money', icon: '📱' },
      { name: 'Vodafone Cash', icon: '📱' },
    ],
    flag: '🇨🇩',
    phonePrefix: '+243',
  },
  'CG': {
    name: 'Republic of Congo',
    nameFR: 'République du Congo',
    code: 'CG',
    currency: 'XAF',
    currencyName: 'Franc CFA BEAC',
    mobileMoneyProviders: [
      { name: 'Orange Money', icon: '📱' },
      { name: 'Airtel Money', icon: '📱' },
      { name: 'MTN Money', icon: '📱' },
    ],
    flag: '🇨🇬',
    phonePrefix: '+242',
  },
  'CI': {
    name: 'Côte d\'Ivoire',
    nameFR: 'Côte d\'Ivoire',
    code: 'CI',
    currency: 'XOF',
    currencyName: 'Franc CFA WAEMU',
    mobileMoneyProviders: [
      { name: 'Orange Money', icon: '📱' },
      { name: 'MTN Money', icon: '📱' },
      { name: 'Moov Money', icon: '📱' },
      { name: 'Wave', icon: '📱' },
    ],
    flag: '🇨🇮',
    phonePrefix: '+225',
  },
  'BJ': {
    name: 'Benin',
    nameFR: 'Bénin',
    code: 'BJ',
    currency: 'XOF',
    currencyName: 'Franc CFA WAEMU',
    mobileMoneyProviders: [
      { name: 'Orange Money', icon: '📱' },
      { name: 'MTN Money', icon: '📱' },
      { name: 'Moov Money', icon: '📱' },
      { name: 'Wave', icon: '📱' },
    ],
    flag: '🇧🇯',
    phonePrefix: '+229',
  },
  'CM': {
    name: 'Cameroon',
    nameFR: 'Cameroun',
    code: 'CM',
    currency: 'XAF',
    currencyName: 'Franc CFA BEAC',
    mobileMoneyProviders: [
      { name: 'Orange Money', icon: '📱' },
      { name: 'MTN Money', icon: '📱' },
      { name: 'Airtel Money', icon: '📱' },
    ],
    flag: '🇨🇲',
    phonePrefix: '+237',
  },
  'SN': {
    name: 'Senegal',
    nameFR: 'Sénégal',
    code: 'SN',
    currency: 'XOF',
    currencyName: 'Franc CFA WAEMU',
    mobileMoneyProviders: [
      { name: 'Orange Money', icon: '📱' },
      { name: 'Free Money', icon: '📱' },
      { name: 'Wave', icon: '📱' },
    ],
    flag: '🇸🇳',
    phonePrefix: '+221',
  },
  'GA': {
    name: 'Gabon',
    nameFR: 'Gabon',
    code: 'GA',
    currency: 'XAF',
    currencyName: 'Franc CFA BEAC',
    mobileMoneyProviders: [
      { name: 'Airtel Money', icon: '📱' },
    ],
    flag: '🇬🇦',
    phonePrefix: '+241',
  },
} as const;

// Devises supportées + taux de change (à jour quotidiennement en prod)
export const CURRENCIES = {
  CDF: { name: 'Franc Congolais', symbol: 'CDF', toUSD: 1 / 2294 },
  XAF: { name: 'Franc CFA BEAC', symbol: 'FCFA', toUSD: 1 / 600 },
  XOF: { name: 'Franc CFA WAEMU', symbol: 'FCFA', toUSD: 1 / 600 },
  USD: { name: 'US Dollar', symbol: '$', toUSD: 1 },
} as const;

// Limites par devise
/** Filet de sécurité — limites réelles : 5–500 USD (voir withdrawalConfig). */
export const WITHDRAWAL_LIMITS = {
  CDF: { min: 5, max: 500, currency: 'CDF' },
  XAF: { min: 5, max: 500, currency: 'XAF' },
  XOF: { min: 5, max: 500, currency: 'XOF' },
  USD: { min: 5, max: 500, currency: 'USD' },
} as const;

// Conversion entre devises
export function convertCurrency(
  amount: number,
  fromCurrency: keyof typeof CURRENCIES,
  toCurrency: keyof typeof CURRENCIES
): number {
  const fromRate = CURRENCIES[fromCurrency].toUSD;
  const toRate = CURRENCIES[toCurrency].toUSD;
  return (amount * fromRate) / toRate;
}

// Obtenir pays par code
export function getCountryByCode(code: string) {
  return COUNTRIES_DATA[code as keyof typeof COUNTRIES_DATA] || null;
}

// Obtenir tous les pays
export function getAllCountries() {
  return Object.values(COUNTRIES_DATA);
}

// Obtenir les providers mobile money pour un pays
export function getMobileMoneyProviders(countryCode: string) {
  const country = getCountryByCode(countryCode);
  return country?.mobileMoneyProviders || [];
}

// Obtenir devise d'un pays
export function getCurrencyByCountry(countryCode: string) {
  const country = getCountryByCode(countryCode);
  return country?.currency || 'USD';
}

// Formater montant avec devise
export function formatAmount(
  amount: number,
  currency: keyof typeof CURRENCIES
): string {
  const curr = CURRENCIES[currency];
  return `${curr.symbol} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Vérifier si montant est dans les limites
export function isWithinLimits(
  amount: number,
  currency: keyof typeof CURRENCIES | string
): { valid: boolean; reason?: string } {
  const result = validateWithdrawalAmount(amount, currency);
  return { valid: result.valid, reason: result.reason };
}
