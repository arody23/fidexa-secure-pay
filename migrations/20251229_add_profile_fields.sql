-- Migration: Ajouter champs profil et tables subscription/withdrawal
-- Date: 2025-12-29

-- ========================
-- 1. MODIFIER TABLE USERS
-- ========================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS kyc_document_url TEXT;

-- ========================
-- 2. CRÉER TABLE SUBSCRIPTIONS
-- ========================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'essential', 'standard', 'premium')),
  price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  commission_rate NUMERIC(5,2) NOT NULL,
  renewal_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id) -- Un seul abonnement actif par user
);

-- ========================
-- 3. CRÉER TABLE WITHDRAWALS
-- ========================

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('bank_transfer', 'mobile_money', 'wallet')),
  mobile_money_provider TEXT, -- MTN, Orange, Vodafone, etc.
  phone_number TEXT,
  account_details JSONB, -- {bank_name, account_number, account_holder, etc}
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================
-- 4. CRÉER TABLE KYC_DOCUMENTS (pour futur)
-- ========================

CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('passport', 'id_card', 'drivers_license')),
  document_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  verified_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, document_type)
);

-- ========================
-- 5. CRÉER INDEXES POUR PERFORMANCE
-- ========================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON public.kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON public.kyc_documents(status);

-- ========================
-- 6. ENABLE RLS SUR NOUVELLES TABLES
-- ========================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- ========================
-- 7. RLS POLICIES - SUBSCRIPTIONS
-- ========================

-- User voit son abonnement
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- User peut créer/update son abonnement
CREATE POLICY "subscriptions_insert_own"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update_own"
  ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ========================
-- 8. RLS POLICIES - WITHDRAWALS
-- ========================

-- User voit ses retraits
CREATE POLICY "withdrawals_select_own"
  ON public.withdrawals
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- User peut créer retrait
CREATE POLICY "withdrawals_insert_own"
  ON public.withdrawals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User peut update son retrait (pas encore traité) + Admin peut update tous
CREATE POLICY "withdrawals_update_own"
  ON public.withdrawals
  FOR UPDATE
  USING (
    (auth.uid() = user_id AND status = 'pending') 
    OR public.is_admin()
  )
  WITH CHECK (
    (auth.uid() = user_id AND status = 'pending')
    OR public.is_admin()
  );

-- ========================
-- 9. RLS POLICIES - KYC_DOCUMENTS
-- ========================

-- User voit ses documents
CREATE POLICY "kyc_documents_select_own"
  ON public.kyc_documents
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- User peut upload document
CREATE POLICY "kyc_documents_insert_own"
  ON public.kyc_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User ne peut pas update (admin only)
CREATE POLICY "kyc_documents_update_admin"
  ON public.kyc_documents
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========================
-- 10. VÉRIFIER LES TABLES
-- ========================

SELECT 'Subscriptions table created' as Status;
SELECT 'Withdrawals table created' as Status;
SELECT 'KYC Documents table created' as Status;

SELECT '' as separator;
SELECT 'Users table modified with:' as Status;
SELECT '- phone_number (TEXT)' as Column;
SELECT '- country (TEXT)' as Column;
SELECT '- subscription_plan (TEXT)' as Column;
SELECT '- commission_rate (NUMERIC)' as Column;
SELECT '- kyc_status (TEXT)' as Column;
SELECT '- kyc_document_url (TEXT)' as Column;
