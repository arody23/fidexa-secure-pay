/** Infos légales & contact FidexaPay — mettre à jour avant prod */
export const SITE = {
  name: 'FidexaPay',
  tagline: 'Paiements sécurisés en escrow pour prestataires africains',
  description:
    'FidexaPay protège les paiements Mobile Money entre prestataires et clients : fonds séquestrés jusqu\'à validation de la livraison.',
  email: 'contact@fidexapay.com',
  supportEmail: 'support@fidexapay.com',
  phone: '+234 842 726 674',
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
  commissionBasic: 15,
} as const;

export const MVP_SUBSCRIPTION = {
  id: 'basic',
  name: 'Basique',
  description: 'Parfait pour débuter',
  price: 0,
  commission: SITE.commissionBasic,
  features: [
    'Liens de paiement illimités',
    'Commission: 15 %',
    'Support email',
    'Rapport mensuel basique',
  ],
} as const;
