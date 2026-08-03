-- Règlements manuels admin : remboursement client, compensation prestataire
-- optionnelle, et retrait du wallet entreprise.

CREATE TABLE IF NOT EXISTS public.refund_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id UUID NOT NULL UNIQUE REFERENCES public.refund_requests(id) ON DELETE CASCADE,
  payment_link_id UUID NOT NULL REFERENCES public.payment_links(id) ON DELETE CASCADE,
  client_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (client_amount >= 0),
  provider_credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (provider_credit_amount >= 0),
  currency TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_provider TEXT NOT NULL,
  client_country TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  kpay_payout_id TEXT,
  kpay_payout_reference TEXT,
  kpay_payout_status TEXT,
  failure_reason TEXT,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_settlements_status
  ON public.refund_settlements(status);

CREATE TABLE IF NOT EXISTS public.provider_wallet_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payment_link_id UUID REFERENCES public.payment_links(id) ON DELETE SET NULL,
  refund_settlement_id UUID UNIQUE REFERENCES public.refund_settlements(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_provider TEXT NOT NULL,
  source_country TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  kpay_payout_id TEXT,
  kpay_payout_reference TEXT,
  kpay_payout_status TEXT,
  failure_reason TEXT,
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.refund_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_wallet_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refund_settlements_admin_only" ON public.refund_settlements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.is_admin = true OR u.role = 'admin'))
  );
CREATE POLICY "provider_wallet_credits_owner" ON public.provider_wallet_credits
  FOR SELECT USING (
    provider_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.is_admin = true OR u.role = 'admin'))
  );
CREATE POLICY "company_withdrawals_admin_only" ON public.company_withdrawals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.is_admin = true OR u.role = 'admin'))
  );

CREATE OR REPLACE FUNCTION public.get_provider_wallet(p_provider_id UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := COALESCE(p_provider_id, auth.uid());
  v_earned NUMERIC := 0;
  v_credits NUMERIC := 0;
  v_withdrawn NUMERIC := 0;
  v_pending NUMERIC := 0;
  v_currency TEXT := 'CDF';
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;
  SELECT COALESCE(NULLIF(trim(currency), ''), 'CDF') INTO v_currency FROM public.users WHERE id = v_uid;
  SELECT COALESCE(SUM(public.convert_amount_fx(COALESCE(pl.net_amount, pl.amount), COALESCE(NULLIF(trim(pl.currency), ''), v_currency), v_currency)), 0)
    INTO v_earned FROM public.payment_links pl
    WHERE pl.provider_id = v_uid AND pl.escrow_released = true AND pl.order_status = 'validated';
  SELECT COALESCE(SUM(public.convert_amount_fx(c.amount, c.currency, v_currency)), 0)
    INTO v_credits FROM public.provider_wallet_credits c WHERE c.provider_id = v_uid;
  SELECT COALESCE(SUM(public.convert_amount_fx(w.amount, COALESCE(NULLIF(trim(w.currency), ''), v_currency), v_currency)), 0)
    INTO v_withdrawn FROM public.withdrawals w WHERE w.user_id = v_uid AND w.status = 'completed';
  SELECT COALESCE(SUM(public.convert_amount_fx(w.amount, COALESCE(NULLIF(trim(w.currency), ''), v_currency), v_currency)), 0)
    INTO v_pending FROM public.withdrawals w WHERE w.user_id = v_uid AND w.status IN ('pending', 'processing');
  RETURN json_build_object(
    'success', true, 'currency', v_currency, 'total_earned', v_earned,
    'refund_compensation', v_credits, 'total_withdrawn', v_withdrawn,
    'pending_withdrawals', v_pending,
    'available_balance', GREATEST(0, v_earned + v_credits - v_withdrawn - v_pending),
    'fx_note', 'Soldes convertis vers la devise du profil (taux pivot USD)'
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
