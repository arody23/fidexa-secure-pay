/**
 * @deprecated Préférer `@/lib/plans` (source de vérité).
 * Conservé pour compatibilité avec l’ancien écran Subscriptions.
 */

import {
  getAllPlans,
  getCommissionRate,
  getPlan,
  normalizePlanId,
  type PlanDefinition,
  type PlanId,
} from '@/lib/plans';

export type { PlanDefinition, PlanId };

/** Forme legacy (IDs anglais + color) pour composants non migrés */
export interface SubscriptionPlan {
  id: PlanId | 'basic' | 'essential' | 'standard';
  name: string;
  description: string;
  price: number;
  commission: number;
  features: string[];
  color: string;
}

const LEGACY_COLORS: Record<PlanId, string> = {
  basique: 'from-blue-500 to-blue-600',
  essentiel: 'from-purple-500 to-purple-600',
  premium: 'from-pink-500 to-pink-600',
};

function toLegacyShape(plan: PlanDefinition): SubscriptionPlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.priceMonthlyUsd,
    commission: plan.commission,
    features: [...plan.features],
    color: LEGACY_COLORS[plan.id],
  };
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  basique: toLegacyShape(getPlan('basique')),
  essentiel: toLegacyShape(getPlan('essentiel')),
  premium: toLegacyShape(getPlan('premium')),
  // Alias anglais
  basic: toLegacyShape(getPlan('basique')),
  essential: toLegacyShape(getPlan('essentiel')),
  standard: toLegacyShape(getPlan('premium')),
};

export const getPlanById = (planId: string): SubscriptionPlan | null => {
  const plan = SUBSCRIPTION_PLANS[planId] ?? SUBSCRIPTION_PLANS[normalizePlanId(planId)];
  return plan ?? null;
};

export { getAllPlans, getCommissionRate };
