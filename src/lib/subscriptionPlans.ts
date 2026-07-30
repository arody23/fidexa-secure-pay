// Plans d'abonnement disponibles

import { SubscriptionPlan } from '@/types/index';

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  basic: {
    id: 'basic',
    name: 'Basique',
    description: 'Parfait pour débuter',
    price: 0,
    commission: 15,
    features: [
      '✓ Liens de paiement illimités',
      '✓ Commission: 15%',
      '✓ Support email',
      '✓ Rapport mensuel basique',
    ],
    color: 'from-blue-500 to-blue-600',
  },
  essential: {
    id: 'essential',
    name: 'Essentiel',
    description: 'Pour les petits commerces',
    price: 15,
    commission: 6,
    features: [
      '✓ Tout du plan Basique',
      '✓ Commission: 6%',
      '✓ Support prioritaire',
      '✓ Rapport détaillé',
      '✓ 2 comptes collaborateurs',
    ],
    color: 'from-purple-500 to-purple-600',
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Pour les entreprises',
    price: 29,
    commission: 4,
    features: [
      '✓ Tout du plan Essentiel',
      '✓ Commission: 4%',
      '✓ Support 24/7',
      '✓ Rapport avancé',
      '✓ 5 comptes collaborateurs',
      '✓ Intégrations API',
    ],
    color: 'from-orange-500 to-orange-600',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Pour les experts',
    price: 49,
    commission: 0,
    features: [
      '✓ Tout du plan Standard',
      '✓ Commission: 0%',
      '✓ Gestionnaire compte dédié',
      '✓ Rapports personnalisés',
      '✓ Collaborateurs illimités',
      '✓ API complet',
      '✓ Formation incluse',
    ],
    color: 'from-pink-500 to-pink-600',
  },
};

export const getPlanById = (planId: string): SubscriptionPlan | null => {
  return SUBSCRIPTION_PLANS[planId] || null;
};

export const getAllPlans = (): SubscriptionPlan[] => {
  return Object.values(SUBSCRIPTION_PLANS);
};

// Obtenir commission pour un plan
export const getCommissionRate = (planId: string): number => {
  const plan = getPlanById(planId);
  return plan?.commission || 15;
};
