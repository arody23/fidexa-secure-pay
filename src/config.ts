/**
 * Configuration de l'application FidexaPay
 */

// Configuration MoneyFusion
export const MONEYFUSION_ENABLED = import.meta.env.VITE_MONEYFUSION_ENABLED === 'true';
export const MONEYFUSION_API_KEY = import.meta.env.VITE_MONEYFUSION_API_KEY;
export const MONEYFUSION_BASE_URL = import.meta.env.VITE_MONEYFUSION_BASE_URL || 'https://api.moneyfusion.net/v1';

// Configuration PayPal (désactivé — remplacé par GeniusPay)
export const PAYPAL_ENABLED = import.meta.env.VITE_PAYPAL_ENABLED === 'true';
export const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
export const PAYPAL_ENV = import.meta.env.VITE_PAYPAL_ENV || 'sandbox';

// Configuration GeniusPay (Mobile Money — clés secrètes côté Supabase Edge Functions)
export const GENIUSPAY_ENABLED = import.meta.env.VITE_GENIUSPAY_ENABLED === 'true';
/** Payout automatique prestataires via GeniusPay (désactivé — API cashout/payout non dispo marchand) */
export const GENIUSPAY_PAYOUT_ENABLED = false;

// Configuration Supabase
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Configuration de l'application
export const APP_NAME = 'FidexaPay';
export const APP_VERSION = '1.0.0';

// Devises supportées
export const CURRENCIES = {
  XOF: 'Franc CFA',
  USD: 'Dollar US',
  EUR: 'Euro',
} as const;

// Délais de livraison par défaut
export const DEFAULT_DELIVERY_DAYS = 7;

// Modes de paiement
export const PAYMENT_MODES = {
  TEST: 'test',
  PAYPAL: 'paypal',
  GENIUSPAY: 'geniuspay',
  MONEYFUSION: 'moneyfusion',
} as const;

export const PAYMENT_MODE = GENIUSPAY_ENABLED
  ? PAYMENT_MODES.GENIUSPAY
  : PAYPAL_ENABLED
  ? PAYMENT_MODES.PAYPAL
  : MONEYFUSION_ENABLED
  ? PAYMENT_MODES.MONEYFUSION
  : PAYMENT_MODES.TEST;

// Statuts de paiement
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
  DELIVERED: 'delivered',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled',
} as const;

// Rôles utilisateurs
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

// Vérifier la configuration
export const isConfigured = () => {
  const checks = {
    supabase: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
    moneyfusion: MONEYFUSION_ENABLED ? !!(MONEYFUSION_API_KEY && MONEYFUSION_BASE_URL) : true,
    paypal: PAYPAL_ENABLED ? !!PAYPAL_CLIENT_ID : true,
    geniuspay: GENIUSPAY_ENABLED ? true : true,
  };

  return {
    ...checks,
    all: Object.values(checks).every(Boolean),
  };
};

// Log de configuration au démarrage
if (import.meta.env.DEV) {
  console.log('FidexaPay Configuration:', {
    mode: import.meta.env.MODE,
    paymentMode: PAYMENT_MODE,
    paypalEnabled: PAYPAL_ENABLED,
    geniuspayEnabled: GENIUSPAY_ENABLED,
    moneyfusionEnabled: MONEYFUSION_ENABLED,
    configured: isConfigured(),
  });
}
