-- Workflow retraits : solde prestataire, demande, validation admin

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'CDF',
  method TEXT NOT NULL CHECK (method IN ('bank_transfer', 'mobile_money', 'wallet')),
  mobile_money_provider TEXT,
  phone_number TEXT,
  account_details JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  rejection_reason TEXT,
  admin_notes TEXT,
  processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON public.withdrawals(created_at DESC);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawals_select_own" ON public.withdrawals;
CREATE POLICY "withdrawals_select_own"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = user_id OR COALESCE((SELECT is_admin FROM public.users WHERE id = auth.uid()), false));

DROP POLICY IF EXISTS "withdrawals_insert_own" ON public.withdrawals;
CREATE POLICY "withdrawals_insert_own"
  ON public.withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Solde disponible = net validé - retraits complétés - retraits en cours
CREATE OR REPLACE FUNCTION public.get_provider_wallet(p_provider_id UUID DEFAULT auth.uid())
RETURNS JSON AS $$
DECLARE
  v_uid UUID := COALESCE(p_provider_id, auth.uid());
  v_earned NUMERIC := 0;
  v_withdrawn NUMERIC := 0;
  v_pending NUMERIC := 0;
  v_currency TEXT := 'CDF';
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT COALESCE(currency, 'CDF') INTO v_currency FROM public.users WHERE id = v_uid;

  SELECT COALESCE(SUM(net_amount), 0) INTO v_earned
  FROM public.payment_links
  WHERE provider_id = v_uid
    AND escrow_released = true
    AND order_status = 'validated'
    AND COALESCE(net_amount, amount) IS NOT NULL;

  IF v_earned = 0 THEN
    SELECT COALESCE(SUM(COALESCE(net_amount, amount)), 0) INTO v_earned
    FROM public.payment_links
    WHERE provider_id = v_uid
      AND escrow_released = true
      AND order_status = 'validated';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_withdrawn
  FROM public.withdrawals
  WHERE user_id = v_uid AND status = 'completed';

  SELECT COALESCE(SUM(amount), 0) INTO v_pending
  FROM public.withdrawals
  WHERE user_id = v_uid AND status IN ('pending', 'processing');

  RETURN json_build_object(
    'success', true,
    'currency', v_currency,
    'total_earned', v_earned,
    'total_withdrawn', v_withdrawn,
    'pending_withdrawals', v_pending,
    'available_balance', GREATEST(0, v_earned - v_withdrawn - v_pending)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Limites minimales par devise (alignées countriesData)
CREATE OR REPLACE FUNCTION public.withdrawal_min_amount(p_currency TEXT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE UPPER(COALESCE(p_currency, 'CDF'))
    WHEN 'CDF' THEN 10000
    WHEN 'XAF' THEN 500
    WHEN 'XOF' THEN 500
    WHEN 'FCFA' THEN 500
    WHEN 'USD' THEN 10
    ELSE 10000
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  amount_param NUMERIC,
  method_param TEXT,
  mobile_money_provider_param TEXT DEFAULT NULL,
  phone_number_param TEXT DEFAULT NULL,
  account_details_param JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_user RECORD;
  v_wallet JSON;
  v_available NUMERIC;
  v_min NUMERIC;
  v_pending_count INT;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT id, kyc_status, country, currency INTO v_user FROM public.users WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profil introuvable');
  END IF;

  IF COALESCE(v_user.kyc_status, '') <> 'verified' THEN
    RETURN json_build_object('success', false, 'error', 'KYC non vérifié — complétez votre identité');
  END IF;

  IF amount_param IS NULL OR amount_param <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Montant invalide');
  END IF;

  IF method_param NOT IN ('mobile_money', 'bank_transfer', 'wallet') THEN
    RETURN json_build_object('success', false, 'error', 'Méthode de retrait invalide');
  END IF;

  v_min := public.withdrawal_min_amount(v_user.currency);
  IF amount_param < v_min THEN
    RETURN json_build_object('success', false, 'error', 'Montant inférieur au minimum (' || v_min || ')');
  END IF;

  v_wallet := public.get_provider_wallet(v_uid);
  v_available := (v_wallet->>'available_balance')::NUMERIC;

  IF amount_param > v_available THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Solde insuffisant. Disponible : ' || v_available,
      'available_balance', v_available
    );
  END IF;

  SELECT COUNT(*) INTO v_pending_count
  FROM public.withdrawals
  WHERE user_id = v_uid AND status IN ('pending', 'processing');

  IF v_pending_count >= 1 THEN
    RETURN json_build_object('success', false, 'error', 'Vous avez déjà une demande de retrait en cours');
  END IF;

  IF method_param = 'mobile_money' AND (phone_number_param IS NULL OR phone_number_param = '') THEN
    RETURN json_build_object('success', false, 'error', 'Numéro Mobile Money requis');
  END IF;

  INSERT INTO public.withdrawals (
    user_id, amount, currency, method,
    mobile_money_provider, phone_number, account_details, status
  ) VALUES (
    v_uid,
    amount_param,
    COALESCE(v_user.currency, 'CDF'),
    method_param,
    mobile_money_provider_param,
    phone_number_param,
    COALESCE(account_details_param, '{}'::jsonb),
    'pending'
  ) RETURNING id INTO v_id;

  INSERT INTO public.notifications (user_id, title, message, type, read)
  VALUES (
    v_uid,
    'Demande de retrait reçue',
    'Votre demande de ' || amount_param || ' ' || COALESCE(v_user.currency, 'CDF') || ' sera traitée sous 24-48h.',
    'withdrawal',
    false
  );

  RETURN json_build_object(
    'success', true,
    'withdrawal_id', v_id,
    'message', 'Demande enregistrée. Traitement sous 24-48h.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(
  withdrawal_id_param UUID,
  action_param TEXT,
  notes_param TEXT DEFAULT NULL,
  rejection_reason_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_admin BOOLEAN;
  w RECORD;
  v_new_status TEXT;
  v_msg TEXT;
BEGIN
  SELECT COALESCE(is_admin, false) OR role = 'admin' INTO v_admin
  FROM public.users WHERE id = auth.uid();

  IF NOT COALESCE(v_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Accès admin requis');
  END IF;

  SELECT * INTO w FROM public.withdrawals WHERE id = withdrawal_id_param FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Retrait introuvable');
  END IF;

  v_new_status := CASE action_param
    WHEN 'approve' THEN 'processing'
    WHEN 'complete' THEN 'completed'
    WHEN 'reject' THEN 'failed'
    WHEN 'cancel' THEN 'cancelled'
    ELSE NULL
  END;

  IF v_new_status IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Action invalide');
  END IF;

  IF action_param = 'approve' AND w.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Seules les demandes en attente peuvent être approuvées');
  END IF;

  IF action_param = 'complete' AND w.status NOT IN ('pending', 'processing') THEN
    RETURN json_build_object('success', false, 'error', 'Statut incompatible pour finaliser');
  END IF;

  IF action_param = 'reject' AND w.status NOT IN ('pending', 'processing') THEN
    RETURN json_build_object('success', false, 'error', 'Impossible de rejeter ce retrait');
  END IF;

  UPDATE public.withdrawals SET
    status = v_new_status,
    admin_notes = COALESCE(notes_param, admin_notes),
    rejection_reason = CASE WHEN action_param = 'reject' THEN rejection_reason_param ELSE rejection_reason END,
    processed_by = auth.uid(),
    processed_at = CASE WHEN v_new_status IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE processed_at END,
    updated_at = NOW()
  WHERE id = withdrawal_id_param;

  v_msg := CASE action_param
    WHEN 'approve' THEN 'Votre retrait est en cours de traitement.'
    WHEN 'complete' THEN 'Votre retrait a été effectué sur votre compte.'
    WHEN 'reject' THEN 'Votre demande de retrait a été refusée : ' || COALESCE(rejection_reason_param, 'contactez le support')
    WHEN 'cancel' THEN 'Votre demande de retrait a été annulée.'
  END;

  INSERT INTO public.notifications (user_id, title, message, type, read)
  VALUES (
    w.user_id,
    'Mise à jour retrait',
    v_msg,
    'withdrawal',
    false
  );

  RETURN json_build_object('success', true, 'status', v_new_status, 'message', 'Retrait mis à jour');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_my_withdrawal(withdrawal_id_param UUID)
RETURNS JSON AS $$
DECLARE
  w RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT * INTO w FROM public.withdrawals
  WHERE id = withdrawal_id_param AND user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Retrait introuvable');
  END IF;

  IF w.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Seules les demandes en attente peuvent être annulées');
  END IF;

  UPDATE public.withdrawals SET status = 'cancelled', updated_at = NOW()
  WHERE id = withdrawal_id_param;

  RETURN json_build_object('success', true, 'message', 'Demande annulée');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_provider_wallet(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_withdrawal(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
