/** Politique de retrait FidexaPay */

import { convertAmount, formatAmount, normalizeCurrency } from '@/lib/currency';

/** Limites en USD, converties selon les taux en vigueur */
export const MIN_WITHDRAWAL_USD = 5;
export const MAX_WITHDRAWAL_USD = 500;

export const WITHDRAWAL_POLICY = {
  processingHoursMin: 24,
  processingHoursMax: 48,
  maxPendingRequests: 1,
  kycRequired: true,
  methods: ['mobile_money'] as const,
  feePercent: 0,
  minUsd: MIN_WITHDRAWAL_USD,
  maxUsd: MAX_WITHDRAWAL_USD,
} as const;

export function getMinWithdrawalAmount(currency?: string | null): number {
  const code = normalizeCurrency(currency || 'USD');
  return Math.ceil(convertAmount(MIN_WITHDRAWAL_USD, 'USD', code));
}

export function getMaxWithdrawalAmount(currency?: string | null): number {
  const code = normalizeCurrency(currency || 'USD');
  // Arrondi inférieur pour ne jamais dépasser 500 USD
  return Math.floor(convertAmount(MAX_WITHDRAWAL_USD, 'USD', code));
}

export function validateWithdrawalAmount(
  amount: number,
  currency?: string | null
): { valid: boolean; reason?: string; min: number; max: number } {
  const code = normalizeCurrency(currency || 'USD');
  const min = getMinWithdrawalAmount(code);
  const max = getMaxWithdrawalAmount(code);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, reason: 'Montant invalide', min, max };
  }
  if (amount < min) {
    return {
      valid: false,
      reason: `Minimum ${formatAmount(min, code)} (5 USD)`,
      min,
      max,
    };
  }
  if (amount > max) {
    return {
      valid: false,
      reason: `Maximum ${formatAmount(max, code)} (500 USD)`,
      min,
      max,
    };
  }
  return { valid: true, min, max };
}

export function formatWithdrawalPolicySummary(currency?: string | null): string[] {
  const code = normalizeCurrency(currency || 'USD');
  const min = getMinWithdrawalAmount(code);
  const max = getMaxWithdrawalAmount(code);
  return [
    `Min. ${formatAmount(min, code)} (5 USD)`,
    `Max. ${formatAmount(max, code)} (500 USD)`,
    `${WITHDRAWAL_POLICY.processingHoursMin}–${WITHDRAWAL_POLICY.processingHoursMax} h`,
    'Mobile Money uniquement',
  ];
}
