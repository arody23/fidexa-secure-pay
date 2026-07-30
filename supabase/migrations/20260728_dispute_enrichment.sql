-- Enrichissement litiges : réponse prestataire + résolution admin depuis statut disputed

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS provider_response TEXT,
  ADD COLUMN IF NOT EXISTS provider_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_evidence_urls JSONB DEFAULT '[]'::jsonb;

-- Autoriser libération escrow depuis litige (décision admin)
CREATE OR REPLACE FUNCTION public.release_escrow_for_order(
  p_link_id TEXT,
  p_actor_type TEXT DEFAULT 'client'
)
RETURNS JSON AS $$
DECLARE
  pl RECORD;
  v_rate NUMERIC;
  v_commission NUMERIC;
  v_net NUMERIC;
BEGIN
  SELECT * INTO pl FROM public.payment_links WHERE link_id = p_link_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

  IF pl.escrow_released = true THEN
    RETURN json_build_object('success', false, 'error', 'Escrow déjà libéré');
  END IF;

  IF pl.order_status NOT IN ('completed', 'validated', 'disputed') THEN
    RETURN json_build_object('success', false, 'error', 'La commande doit être terminée ou en litige');
  END IF;

  v_rate := public.get_provider_commission_rate(pl.provider_id);
  v_commission := ROUND(COALESCE(pl.amount, 0) * v_rate / 100.0, 2);
  v_net := COALESCE(pl.amount, 0) - v_commission;

  UPDATE public.payment_links SET
    order_status = 'validated',
    status = 'validated',
    validated_at = NOW(),
    escrow_released = true,
    escrow_released_at = NOW(),
    commission_rate = v_rate,
    commission_amount = v_commission,
    net_amount = v_net,
    auto_validated = (p_actor_type IN ('system', 'admin'))
  WHERE link_id = p_link_id;

  INSERT INTO public.order_timeline (payment_link_id, status, action, description, actor_type)
  VALUES (
    pl.id,
    'validated',
    CASE
      WHEN p_actor_type = 'admin' THEN 'Décision litige — paiement prestataire'
      WHEN p_actor_type = 'system' THEN 'Validation automatique'
      ELSE 'Validation client'
    END,
    CASE
      WHEN p_actor_type = 'admin' THEN 'Fonds libérés suite à décision admin (commission ' || v_rate || '%)'
      WHEN p_actor_type = 'system' THEN 'Fonds libérés automatiquement après délai de grâce (commission ' || v_rate || '%)'
      ELSE 'Le client a validé la livraison (commission ' || v_rate || '%)'
    END,
    p_actor_type
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Paiement libéré au prestataire',
    'commission_rate', v_rate,
    'commission_amount', v_commission,
    'net_amount', v_net
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  dispute_id_param UUID,
  decision_param TEXT,
  resolution_notes_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  d RECORD;
  pl RECORD;
  v_admin BOOLEAN;
  v_release JSON;
BEGIN
  SELECT COALESCE(is_admin, false) OR role = 'admin' INTO v_admin
  FROM public.users WHERE id = auth.uid();

  IF NOT COALESCE(v_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Accès admin requis');
  END IF;

  SELECT * INTO d FROM public.disputes WHERE id = dispute_id_param;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Litige introuvable');
  END IF;

  IF d.status = 'resolved' THEN
    RETURN json_build_object('success', false, 'error', 'Litige déjà résolu');
  END IF;

  SELECT * INTO pl FROM public.payment_links WHERE id = d.payment_link_id;

  UPDATE public.disputes SET
    status = 'resolved',
    resolution = resolution_notes_param,
    resolution_type = decision_param,
    resolution_notes = resolution_notes_param,
    admin_notes = resolution_notes_param,
    resolved_at = NOW(),
    resolved_by = auth.uid(),
    resolved_in_favor_of = CASE
      WHEN decision_param = 'refund_client' THEN 'client'
      WHEN decision_param = 'pay_provider' THEN 'provider'
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = dispute_id_param;

  IF decision_param = 'refund_client' THEN
    UPDATE public.payment_links SET
      order_status = 'cancelled',
      status = 'cancelled',
      refunded = true,
      refunded_at = NOW(),
      escrow_released = false,
      updated_at = NOW()
    WHERE id = d.payment_link_id;

    IF pl.id IS NOT NULL THEN
      INSERT INTO public.order_timeline (payment_link_id, status, action, description, actor_type, actor_id)
      VALUES (pl.id, 'cancelled', 'Remboursement client', COALESCE(resolution_notes_param, 'Décision admin — remboursement client'), 'admin', auth.uid());
    END IF;

  ELSIF decision_param = 'pay_provider' AND pl.link_id IS NOT NULL THEN
    v_release := public.release_escrow_for_order(pl.link_id, 'admin');
    IF (v_release->>'success')::boolean IS NOT TRUE THEN
      RETURN json_build_object(
        'success', false,
        'error', COALESCE(v_release->>'error', 'Impossible de libérer les fonds au prestataire')
      );
    END IF;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Décision invalide');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Litige résolu avec succès');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.submit_provider_dispute_response(
  link_id_param TEXT,
  response_param TEXT,
  evidence_urls_param JSONB DEFAULT '[]'::jsonb
)
RETURNS JSON AS $$
DECLARE
  pl RECORD;
  d_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  IF trim(COALESCE(response_param, '')) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Réponse requise');
  END IF;

  SELECT * INTO pl FROM public.payment_links WHERE link_id = link_id_param;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

  IF pl.provider_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé');
  END IF;

  IF pl.order_status IS DISTINCT FROM 'disputed' THEN
    RETURN json_build_object('success', false, 'error', 'Aucun litige actif sur cette commande');
  END IF;

  UPDATE public.disputes SET
    provider_response = response_param,
    provider_response_at = NOW(),
    provider_evidence_urls = COALESCE(evidence_urls_param, '[]'::jsonb),
    updated_at = NOW()
  WHERE payment_link_id = pl.id AND status = 'open'
  RETURNING id INTO d_id;

  IF d_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Litige introuvable');
  END IF;

  INSERT INTO public.order_timeline (payment_link_id, status, action, description, actor_type, actor_id)
  VALUES (pl.id, 'disputed', 'Réponse prestataire', 'Le prestataire a soumis sa version des faits', 'provider', auth.uid());

  RETURN json_build_object('success', true, 'message', 'Réponse enregistrée', 'dispute_id', d_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.submit_provider_dispute_response(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(UUID, TEXT, TEXT) TO authenticated;
