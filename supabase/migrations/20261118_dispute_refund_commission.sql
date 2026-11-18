-- Litige → remboursement client : garder la commission FidexaPay,
-- ne pas marquer refunded avant payout KPay, préparer refund_request.

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
  v_rate NUMERIC;
  v_commission NUMERIC;
  v_refundable NUMERIC;
  v_req_id UUID;
  v_provider RECORD;
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
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

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
    v_rate := public.get_provider_commission_rate(pl.provider_id);
    v_commission := ROUND(COALESCE(pl.amount, 0) * v_rate / 100.0, 2);
    v_refundable := GREATEST(0, ROUND(COALESCE(pl.amount, 0) - v_commission, 2));

    -- Ne PAS marquer refunded=true ici : le solde KPay part seulement après payout.
    UPDATE public.payment_links SET
      order_status = 'cancelled',
      status = 'cancelled',
      cancelled_at = COALESCE(cancelled_at, NOW()),
      refunded = false,
      refunded_at = NULL,
      escrow_released = false,
      commission_rate = v_rate,
      commission_amount = v_commission,
      net_amount = v_refundable,
      updated_at = NOW()
    WHERE id = pl.id;

    INSERT INTO public.order_timeline (payment_link_id, status, action, description, actor_type, actor_id)
    VALUES (
      pl.id,
      'cancelled',
      'Décision litige — remboursement client',
      format(
        'Admin: remboursement client prévu %s (commission FidexaPay %s%% = %s conservée). %s',
        v_refundable::text,
        v_rate::text,
        v_commission::text,
        COALESCE(resolution_notes_param, '')
      ),
      'admin',
      auth.uid()
    );

    SELECT id INTO v_req_id
    FROM public.refund_requests
    WHERE payment_link_id = pl.id
      AND status IN ('pending', 'awaiting_provider', 'awaiting_client', 'under_review', 'approved')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_req_id IS NULL THEN
      INSERT INTO public.refund_requests (
        payment_link_id, link_id, requester_role, client_statement, status,
        admin_decision, admin_id, decided_at
      ) VALUES (
        pl.id,
        pl.link_id,
        'client',
        COALESCE(d.reason, d.description, 'Litige — remboursement client'),
        'approved',
        resolution_notes_param,
        auth.uid(),
        NOW()
      )
      RETURNING id INTO v_req_id;
    ELSE
      UPDATE public.refund_requests SET
        status = 'approved',
        admin_decision = resolution_notes_param,
        admin_id = auth.uid(),
        decided_at = NOW(),
        updated_at = NOW()
      WHERE id = v_req_id;
    END IF;

    SELECT full_name, phone_number INTO v_provider
    FROM public.users WHERE id = pl.provider_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Litige tranché — lancez le payout KPay (85% max, commission conservée)',
      'decision', 'refund_client',
      'refund_request_id', v_req_id,
      'payment_link_id', pl.id,
      'link_id', pl.link_id,
      'amount', pl.amount,
      'currency', COALESCE(pl.currency, 'CDF'),
      'commission_rate', v_rate,
      'commission_amount', v_commission,
      'refundable_amount', v_refundable,
      'client_phone', pl.client_phone,
      'client_name', pl.client_name,
      'provider_phone', v_provider.phone_number,
      'provider_name', COALESCE(pl.provider_name, v_provider.full_name),
      'needs_kpay_payout', true
    );

  ELSIF decision_param = 'pay_provider' THEN
    v_release := public.release_escrow_for_order(pl.link_id, 'admin');
    IF (v_release->>'success')::boolean IS NOT TRUE THEN
      RETURN json_build_object(
        'success', false,
        'error', COALESCE(v_release->>'error', 'Impossible de libérer les fonds au prestataire')
      );
    END IF;

    SELECT full_name, phone_number INTO v_provider
    FROM public.users WHERE id = pl.provider_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Litige résolu — fonds libérés au prestataire (commission déduite)',
      'decision', 'pay_provider',
      'payment_link_id', pl.id,
      'link_id', pl.link_id,
      'amount', pl.amount,
      'currency', COALESCE(pl.currency, 'CDF'),
      'commission_rate', v_release->>'commission_rate',
      'commission_amount', v_release->>'commission_amount',
      'net_amount', v_release->>'net_amount',
      'client_phone', pl.client_phone,
      'client_name', pl.client_name,
      'provider_phone', v_provider.phone_number,
      'provider_name', COALESCE(pl.provider_name, v_provider.full_name),
      'needs_kpay_payout', false
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'Décision invalide');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(UUID, TEXT, TEXT) TO authenticated;

-- Templates WhatsApp plus explicites
INSERT INTO public.notification_templates (event_type, category, name, description, channel, body, variables)
VALUES
  (
    'dispute.opened',
    'litige',
    'Litige ouvert',
    'Client et prestataire informés',
    'whatsapp',
    'FidexaPay — Un litige a été ouvert sur la commande {{order_reference}}. Raison: {{reason}}. FidexaPay examine le dossier et vous tiendra informé.',
    ARRAY['order_reference', 'client_name', 'merchant_name', 'reason', 'amount', 'currency']
  ),
  (
    'dispute.resolved',
    'litige',
    'Litige résolu',
    'Décision admin notifiée aux deux parties',
    'whatsapp',
    'FidexaPay — Litige résolu sur {{order_reference}}. Décision: {{decision_label}}. {{resolution_notes}}',
    ARRAY['order_reference', 'client_name', 'merchant_name', 'decision_label', 'resolution_notes', 'amount', 'currency', 'refundable_amount']
  )
ON CONFLICT (event_type) DO UPDATE SET
  body = EXCLUDED.body,
  variables = EXCLUDED.variables,
  description = EXCLUDED.description,
  updated_at = NOW();
