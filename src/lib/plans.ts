/**
 * Source de vérité des plans FidexaPay.
 * Aucune valeur de plan (prix, commission, limites…) ne doit être dupliquée ailleurs :
 * importer depuis ce fichier.
 *
 * Commission = pourcentage entier (9 = 9 %), aligné sur le SQL `amount * rate / 100`.
 * maxMilestones > 1 et teamMembers > 1 = phase 2 (contrôle possible, UI incomplète).
 */

export type PlanId = 'basique' | 'essentiel' | 'premium';

export type BillingCycle = 'monthly' | 'yearly';

export type WhatsappTier = 'core' | 'plus' | 'pro';

export type ReportTier = 'monthly_basic' | 'monthly_detailed' | 'weekly';

export type ReceiptType = 'simple' | 'pdf' | 'numbered_invoice';

/** Anciens IDs anglais encore présents en DB / code legacy */
export type LegacyPlanId = 'basic' | 'essential' | 'standard' | 'premium';

export interface PlanDefinition {
  id: PlanId;
  /** Libellé UI (toujours capitalisé FR) */
  name: string;
  description: string;
  /** USD / mois — Basique = 0 */
  priceMonthlyUsd: number;
  /** USD / an (null si plan gratuit) */
  priceYearlyUsd: number | null;
  /** Pourcentage entier, ex. 9 */
  commission: number;
  /** null = illimité */
  activeLinksLimit: number | null;
  linkValidityDays: number;
  maxTransactionUsd: number;
  withdrawalSla: string;
  disputeSlaHours: number;
  supportSlaHours: number;
  whatsappTier: WhatsappTier;
  reportTier: ReportTier;
  csvExport: boolean;
  pdfExport: boolean;
  receiptType: ReceiptType;
  /** null = illimité ; > 1 = phase 2 */
  maxMilestones: number | null;
  /** > 1 = phase 2 */
  teamMembers: number;
  verifiedBadge: boolean;
  earlyAccess: boolean;
  /** Points marketing pour pages tarifs / abonnement */
  features: readonly string[];
}

const LEGACY_TO_PLAN: Record<string, PlanId> = {
  basique: 'basique',
  essentiel: 'essentiel',
  premium: 'premium',
  basic: 'basique',
  essential: 'essentiel',
  /** Ancien « standard » (4 %) → premium actuel */
  standard: 'premium',
};

export const DEFAULT_PLAN_ID: PlanId = 'basique';

/** Taux figé pour les liens déjà ouverts avant le passage Basique 15 % → 9 %. */
export const LEGACY_COMMISSION_PERCENT = 15;

export const PLANS: Record<PlanId, PlanDefinition> = {
  basique: {
    id: 'basique',
    name: 'Basique',
    description: 'Gratuit pour démarrer',
    priceMonthlyUsd: 0,
    priceYearlyUsd: null,
    commission: 9,
    activeLinksLimit: 5,
    linkValidityDays: 7,
    maxTransactionUsd: 500,
    withdrawalSla: '24h',
    disputeSlaHours: 72,
    supportSlaHours: 48,
    whatsappTier: 'core',
    reportTier: 'monthly_basic',
    csvExport: false,
    pdfExport: false,
    receiptType: 'simple',
    maxMilestones: 1,
    teamMembers: 1,
    verifiedBadge: false,
    earlyAccess: false,
    features: [
      '5 liens de paiement actifs',
      'Commission 9 %',
      'Validité des liens : 7 jours',
      'Plafond 500 USD / transaction',
      'Retrait sous 24 h',
      'Support WhatsApp (48 h)',
    ],
  },
  essentiel: {
    id: 'essentiel',
    name: 'Essentiel',
    description: 'Pour les prestataires réguliers',
    priceMonthlyUsd: 29,
    priceYearlyUsd: 290,
    commission: 6,
    activeLinksLimit: 25,
    linkValidityDays: 30,
    maxTransactionUsd: 3000,
    withdrawalSla: '6h',
    disputeSlaHours: 48,
    supportSlaHours: 24,
    whatsappTier: 'plus',
    reportTier: 'monthly_detailed',
    csvExport: true,
    pdfExport: false,
    receiptType: 'pdf',
    maxMilestones: 3,
    teamMembers: 1,
    verifiedBadge: false,
    earlyAccess: false,
    features: [
      '25 liens de paiement actifs',
      'Commission 6 %',
      'Validité des liens : 30 jours',
      'Plafond 3 000 USD / transaction',
      'Retrait sous 6 h',
      'Export CSV + reçu PDF',
      'Support WhatsApp prioritaire (24 h)',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Pour les volumes élevés',
    priceMonthlyUsd: 69,
    priceYearlyUsd: 690,
    commission: 4,
    activeLinksLimit: null,
    linkValidityDays: 90,
    maxTransactionUsd: 15000,
    withdrawalSla: 'auto',
    disputeSlaHours: 24,
    supportSlaHours: 4,
    whatsappTier: 'pro',
    reportTier: 'weekly',
    csvExport: true,
    pdfExport: true,
    receiptType: 'numbered_invoice',
    maxMilestones: null,
    teamMembers: 3,
    verifiedBadge: true,
    earlyAccess: true,
    features: [
      'Liens de paiement illimités',
      'Commission 4 %',
      'Validité des liens : 90 jours',
      'Plafond 15 000 USD / transaction',
      'Retrait automatique',
      'Exports CSV/PDF + facture numérotée',
      'Badge vérifié + early access',
      'Support WhatsApp pro (4 h)',
    ],
  },
} as const;

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function normalizePlanId(raw: string | null | undefined): PlanId {
  if (!raw) return DEFAULT_PLAN_ID;
  const key = String(raw).trim().toLowerCase();
  return LEGACY_TO_PLAN[key] ?? DEFAULT_PLAN_ID;
}

export function getPlan(planId: string | null | undefined): PlanDefinition {
  return PLANS[normalizePlanId(planId)];
}

export function getAllPlans(): PlanDefinition[] {
  return PLAN_IDS.map((id) => PLANS[id]);
}

export function getCommissionRate(planId: string | null | undefined): number {
  return getPlan(planId).commission;
}

export function isUnlimitedActiveLinks(planId: string | null | undefined): boolean {
  return getPlan(planId).activeLinksLimit == null;
}

export function isUnlimitedMilestones(planId: string | null | undefined): boolean {
  return getPlan(planId).maxMilestones == null;
}

/** Phase 2 : milestones multi-étapes (contrôle sans UI complète). */
export function assertMilestonesAllowed(
  planId: string | null | undefined,
  milestoneCount: number
): void {
  const max = getPlan(planId).maxMilestones;
  if (max != null && milestoneCount > max) {
    throw new Error(
      `Le plan ${getPlan(planId).name} autorise au plus ${max} jalon(s) (phase 2).`
    );
  }
}

/** Phase 2 : membres d’équipe (contrôle sans UI complète). */
export function assertTeamMembersAllowed(
  planId: string | null | undefined,
  memberCount: number
): void {
  const max = getPlan(planId).teamMembers;
  if (memberCount > max) {
    throw new Error(
      `Le plan ${getPlan(planId).name} autorise au plus ${max} membre(s) d’équipe (phase 2).`
    );
  }
}

export function planPriceUsd(
  planId: string | null | undefined,
  cycle: BillingCycle = 'monthly'
): number {
  const plan = getPlan(planId);
  if (cycle === 'yearly' && plan.priceYearlyUsd != null) {
    return plan.priceYearlyUsd;
  }
  return plan.priceMonthlyUsd;
}

/**
 * Plafond transaction effectif : override admin KYC prioritaire, sinon plafond du plan.
 */
export function effectiveMaxTransactionUsd(
  planId: string | null | undefined,
  overrideMaxTransactionUsd?: number | null
): number {
  if (overrideMaxTransactionUsd != null && overrideMaxTransactionUsd > 0) {
    return overrideMaxTransactionUsd;
  }
  return getPlan(planId).maxTransactionUsd;
}
