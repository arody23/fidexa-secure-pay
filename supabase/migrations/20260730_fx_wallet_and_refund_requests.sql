-- FX conversion for wallet display + refund requests (no auto-refund)

-- Taux pivot USD (aligné GeniusPay doc : 1 USD ≈ 600 XOF)
CREATE OR REPLACE FUNCTION public.fx_units_per_usd(p_currency TEXT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE UPPER(COALESCE(NULLIF(trim(p_currency), ''), 'USD'))
    WHEN 'USD' THEN 1::NUMERIC
    WHEN 'EUR' THEN 0.92::NUMERIC
    WHEN 'GBP' THEN 0.79::NUMERIC
    WHEN 'XOF' THEN 600::NUMERIC
    WHEN 'XAF' THEN 600::NUMERIC
    WHEN 'FCFA' THEN 600::NUMERIC
    WHEN 'CDF' THEN 2850::NUMERIC
    ELSE 1::NUMERIC
  END;
$$;

CREATE OR REPLACE FUNCTION public.convert_amount_fx(
  p_amount NUMERIC,
  p_from TEXT,
  p_to TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_from TEXT := UPPER(COALESCE(NULLIF(trim(p_from), ''), 'USD'));
  v_to TEXT := UPPER(COALESCE(NULLIF(trim(p_to), ''), 'USD'));
  v_usd NUMERIC;
BEGIN
  IF p_amount IS NULL THEN
    RETURN 0;
  END IF;
  IF v_from IN ('XOF', 'XAF') THEN v_from := 'FCFA'; END IF;
  IF v_to IN ('XOF', 'XAF') THEN v_to := 'FCFA'; END IF;
  IF v_from = v_to THEN
    RETURN ROUND(p_amount, 2);
  END IF;
  v_usd := p_amount / public.fx_units_per_usd(v_from);
  RETURN ROUND(v_usd * public.fx_units_per_usd(v_to), 2);
END;
$$;

-- Solde : convertir chaque lien depuis sa devise vers la devise profil
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

  SELECT COALESCE(NULLIF(trim(currency), ''), 'CDF') INTO v_currency
  FROM public.users WHERE id = v_uid;

  SELECT COALESCE(SUM(
    public.convert_amount_fx(
      COALESCE(pl.net_amount, pl.amount),
      COALESCE(NULLIF(trim(pl.currency), ''), v_currency),
      v_currency
    )
  ), 0) INTO v_earned
  FROM public.payment_links pl
  WHERE pl.provider_id = v_uid
    AND pl.escrow_released = true
    AND pl.order_status = 'validated';

  SELECT COALESCE(SUM(
    public.convert_amount_fx(
      w.amount,
      COALESCE(NULLIF(trim(w.currency), ''), v_currency),
      v_currency
    )
  ), 0) INTO v_withdrawn
  FROM public.withdrawals w
  WHERE w.user_id = v_uid AND w.status = 'completed';

  SELECT COALESCE(SUM(
    public.convert_amount_fx(
      w.amount,
      COALESCE(NULLIF(trim(w.currency), ''), v_currency),
      v_currency
    )
  ), 0) INTO v_pending
  FROM public.withdrawals w
  WHERE w.user_id = v_uid AND w.status IN ('pending', 'processing');

  RETURN json_build_object(
    'success', true,
    'currency', v_currency,
    'total_earned', v_earned,
    'total_withdrawn', v_withdrawn,
    'pending_withdrawals', v_pending,
    'available_balance', GREATEST(0, v_earned - v_withdrawn - v_pending),
    'fx_note', 'Soldes convertis vers la devise du profil (taux pivot USD)'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Demandes d'annulation / remboursement (pas de remboursement auto)
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_link_id UUID NOT NULL REFERENCES public.payment_links(id) ON DELETE CASCADE,
  link_id TEXT NOT NULL,
  requester_role TEXT NOT NULL CHECK (requester_role IN ('client', 'provider')),
  client_statement TEXT,
  provider_statement TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'awaiting_provider', 'awaiting_client', 'under_review', 'approved', 'rejected', 'cancelled')),
  admin_decision TEXT,
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_requests_open_link
  ON public.refund_requests(payment_link_id)
  WHERE status IN ('pending', 'awaiting_provider', 'awaiting_client', 'under_review');

CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests(status);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refund_requests_select" ON public.refund_requests;
CREATE POLICY "refund_requests_select" ON public.refund_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payment_links pl
      WHERE pl.id = payment_link_id
        AND (pl.provider_id = auth.uid() OR true)
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.is_admin = true OR u.role = 'admin'))
  );

DROP POLICY IF EXISTS "refund_requests_insert" ON public.refund_requests;
CREATE POLICY "refund_requests_insert" ON public.refund_requests FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "refund_requests_update" ON public.refund_requests;
CREATE POLICY "refund_requests_update" ON public.refund_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.payment_links pl WHERE pl.id = payment_link_id AND pl.provider_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.is_admin = true OR u.role = 'admin'))
    OR true
  );

-- Client annule avant démarrage prestataire → demande (PAS refund auto)
CREATE OR REPLACE FUNCTION public.request_cancel_refund(
  link_id_param TEXT,
  reason_param TEXT,
  actor_role TEXT DEFAULT 'client'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.payment_links%ROWTYPE;
  v_req_id UUID;
BEGIN
  IF reason_param IS NULL OR length(trim(reason_param)) < 10 THEN
    RETURN json_build_object('success', false, 'error', 'Expliquez la raison (min. 10 caractères)');
  END IF;

  SELECT * INTO v_link FROM public.payment_links WHERE link_id = link_id_param FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

  IF v_link.is_paid IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'La commande n''est pas payée');
  END IF;

  IF v_link.order_status IS DISTINCT FROM 'paid' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Annulation client possible uniquement tant que le prestataire n''a pas commencé (statut paid)'
    );
  END IF;

  IF COALESCE(v_link.can_cancel, true) = false THEN
    RETURN json_build_object('success', false, 'error', 'Annulation non autorisée pour cette commande');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.refund_requests r
    WHERE r.payment_link_id = v_link.id
      AND r.status IN ('pending', 'awaiting_provider', 'awaiting_client', 'under_review')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Une demande de remboursement est déjà en cours');
  END IF;

  INSERT INTO public.refund_requests (
    payment_link_id, link_id, requester_role, client_statement, status
  ) VALUES (
    v_link.id,
    v_link.link_id,
    'client',
    trim(reason_param),
    'awaiting_provider'
  )
  RETURNING id INTO v_req_id;

  UPDATE public.payment_links SET
    order_status = 'disputed',
    status = 'disputed',
    updated_at = now()
  WHERE id = v_link.id;

  INSERT INTO public.order_timeline (payment_link_id, status, action, description, actor_type)
  VALUES (
    v_link.id,
    'disputed',
    'Demande d''annulation / remboursement',
    left(trim(reason_param), 400),
    'client'
  );

  -- Notification prestataire
  INSERT INTO public.notifications (user_id, type, title, message, link, read)
  VALUES (
    v_link.provider_id,
    'dispute',
    'Demande d''annulation client',
    'Le client demande l''annulation avant démarrage. Donnez votre version des faits.',
    '/dashboard/active-orders',
    false
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Demande envoyée. Le prestataire et l''admin doivent examiner le dossier avant tout remboursement.',
    'refund_request_id', v_req_id,
    'auto_refund', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_cancel_refund(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_amount_fx(NUMERIC, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_wallet(UUID) TO authenticated;

-- Prestataire répond à la demande
CREATE OR REPLACE FUNCTION public.respond_refund_request(
  request_id_param UUID,
  statement_param TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.refund_requests%ROWTYPE;
  v_link public.payment_links%ROWTYPE;
BEGIN
  IF statement_param IS NULL OR length(trim(statement_param)) < 10 THEN
    RETURN json_build_object('success', false, 'error', 'Votre version des faits est requise (min. 10 caractères)');
  END IF;

  SELECT * INTO v_req FROM public.refund_requests WHERE id = request_id_param FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Demande introuvable');
  END IF;

  SELECT * INTO v_link FROM public.payment_links WHERE id = v_req.payment_link_id;
  IF v_link.provider_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé');
  END IF;

  UPDATE public.refund_requests SET
    provider_statement = trim(statement_param),
    status = 'under_review',
    updated_at = now()
  WHERE id = request_id_param;

  RETURN json_build_object(
    'success', true,
    'message', 'Votre version a été enregistrée. Un admin appliquera la politique de remboursement.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_refund_request(UUID, TEXT) TO authenticated;

-- Admin décide (applique politique — pas de payout auto GeniusPay ici)
CREATE OR REPLACE FUNCTION public.decide_refund_request(
  request_id_param UUID,
  decision_param TEXT,
  admin_note_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.refund_requests%ROWTYPE;
  v_is_admin BOOLEAN := false;
BEGIN
  SELECT (is_admin = true OR role = 'admin') INTO v_is_admin
  FROM public.users WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Admin requis');
  END IF;

  IF decision_param NOT IN ('approved', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'Décision invalide');
  END IF;

  SELECT * INTO v_req FROM public.refund_requests WHERE id = request_id_param FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Demande introuvable');
  END IF;

  UPDATE public.refund_requests SET
    status = decision_param,
    admin_decision = admin_note_param,
    admin_id = auth.uid(),
    decided_at = now(),
    updated_at = now()
  WHERE id = request_id_param;

  IF decision_param = 'approved' THEN
    UPDATE public.payment_links SET
      order_status = 'cancelled',
      status = 'cancelled',
      cancelled_at = now(),
      refunded = true,
      refunded_at = now(),
      updated_at = now()
    WHERE id = v_req.payment_link_id;
  ELSE
    UPDATE public.payment_links SET
      order_status = 'paid',
      status = 'paid',
      updated_at = now()
    WHERE id = v_req.payment_link_id;
  END IF;

  RETURN json_build_object('success', true, 'decision', decision_param);
END;
$$;

GRANT EXECUTE ON FUNCTION public.decide_refund_request(UUID, TEXT, TEXT) TO authenticated;
