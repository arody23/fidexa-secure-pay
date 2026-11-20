import { PLANS } from '@/lib/plans';

/** URL publique de production (liens partage / WhatsApp côté client si besoin) */
export const APP_PUBLIC_URL = (
  import.meta.env.VITE_APP_PUBLIC_URL || 'https://fidexa-secure-pay.vercel.app'
).replace(/\/$/, '');

/** Infos légales & contact FidexaPay — mettre à jour avant prod */
export const SITE = {
  name: 'FidexaPay',
  tagline: 'Paiements sécurisés en escrow pour prestataires africains',
  description:
    'FidexaPay protège les paiements Mobile Money entre prestataires et clients : fonds séquestrés jusqu\'à validation de la livraison.',
  email: 'contact@fidexapay.com',
  supportEmail: 'support@fidexapay.com',
  phone: '+243 822726674',
  address: 'Kinshasa, République Démocratique du Congo',
  founded: '2026',
  /** URL vidéo démo (YouTube embed ou fichier /assets/demo.mp4) */
  demoVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  demoVideoPoster: '/placeholder.svg',
  social: {
    twitter: 'https://twitter.com/FidexaPay',
    linkedin: 'https://linkedin.com/company/fidexapay',
    facebook: 'https://facebook.com/fidexapay',
  },
  legal: {
    privacy: '/legal/confidentialite',
    terms: '/legal/conditions',
    cookies: '/legal/cookies',
    escrow: '/legal/paiement-securise',
    refund: '/legal/remboursement',
    disputes: '/legal/litiges',
    kycAml: '/legal/kyc-aml',
    prePayment: '/legal/avant-paiement',
  },
  /** Dérivé de `lib/plans.ts` — ne pas modifier ici */
  commissionBasic: PLANS.basique.commission,
} as const;

/** Affichage landing / abonnement — valeurs issues de `lib/plans.ts` */
export const MVP_SUBSCRIPTION = {
  id: PLANS.basique.id,
  name: PLANS.basique.name,
  description: PLANS.basique.description,
  price: PLANS.basique.priceMonthlyUsd,
  commission: PLANS.basique.commission,
  features: PLANS.basique.features,
} as const;
