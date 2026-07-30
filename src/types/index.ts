// Types pour les nouvelles fonctionnalités

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  skills?: string;
  phone_number?: string;
  country?: string;
  currency?: string;
  subscription_plan: 'basic' | 'essential' | 'standard' | 'premium';
  commission_rate: number;
  kyc_status: 'pending' | 'verified' | 'rejected' | 'not_submitted';
  kyc_document_url?: string;
  is_admin: boolean;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'basic' | 'essential' | 'standard' | 'premium';
  price: number;
  currency: 'USD' | 'EUR' | 'XOF' | 'XAF' | 'CDF';
  commission_rate: number;
  renewal_date: string;
  status: 'active' | 'paused' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: 'basic' | 'essential' | 'standard' | 'premium';
  name: string;
  description: string;
  price: number;
  commission: number;
  features: string[];
  color: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'XOF' | 'XAF' | 'CDF';
  method: 'bank_transfer' | 'mobile_money' | 'wallet';
  mobile_money_provider?: string;
  phone_number?: string;
  account_details?: {
    bank_name?: string;
    account_number?: string;
    account_holder?: string;
    routing_number?: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  rejection_reason?: string;
  created_at: string;
  processed_at?: string;
  updated_at: string;
}

export interface KycDocument {
  id: string;
  user_id: string;
  document_type: 'passport' | 'id_card' | 'drivers_license';
  document_url: string;
  status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string;
  verified_by?: string;
  created_at: string;
  verified_at?: string;
}

export interface Country {
  code: string;
  name: string;
  nameFR: string;
  currency: string;
  currencyName: string;
  mobileMoneyProviders: Array<{
    name: string;
    icon: string;
  }>;
  flag: string;
  phonePrefix: string;
}
