/** Politique de retrait FidexaPay — affichage UI + doc opérationnelle */

import { WITHDRAWAL_LIMITS, formatAmount } from '@/lib/countriesData';

export const WITHDRAWAL_POLICY = {
  /** Délai annoncé au prestataire */
  processingHoursMin: 24,
  processingHoursMax: 48,
  /** Une seule demande en attente à la fois */
  maxPendingRequests: 1,
  /** KYC obligatoire */
  kycRequired: true,
  /** Méthodes autorisées */
  methods: ['mobile_money', 'bank_transfer'] as const,
  /** Frais plateforme sur retrait (0 % en sandbox / lancement) */
  feePercent: 0,
} as const;

export function getWithdrawalLimits(currency: keyof typeof WITHDRAWAL_LIMITS) {
  return WITHDRAWAL_LIMITS[currency] ?? WITHDRAWAL_LIMITS.CDF;
}

export function formatWithdrawalPolicySummary(currency: keyof typeof WITHDRAWAL_LIMITS): string[] {
  const limits = getWithdrawalLimits(currency);
  return [
    `Solde minimum retirable : ${formatAmount(limits.min, currency)}`,
    `Maximum par demande : ${formatAmount(limits.max, currency)}`,
    `Délai de traitement : ${WITHDRAWAL_POLICY.processingHoursMin} à ${WITHDRAWAL_POLICY.processingHoursMax} h ouvrées`,
    'KYC vérifié obligatoire',
    'Une demande en attente à la fois',
    'Seuls les fonds libérés (commandes validées) sont retirables',
  ];
}
