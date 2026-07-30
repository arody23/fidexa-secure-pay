-- Escrow workflow: commission, auto-release, support client anonyme, timeline publique

ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_validated BOOLEAN DEFAULT false;

ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS payment_link_id UUID REFERENCES public.payment_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT;

ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS evidence_urls JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_type TEXT;

-- Taux commission selon plan prestataire
CREATE OR REPLACE FUNCTION public.get_provider_commission_rate(p_provider_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_plan TEXT;
  v_rate NUMERIC;
BEGIN
  SELECT subscription_plan, commission_rate INTO v_plan, v_rate
  FROM public.users WHERE id = p_provider_id;

  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  RETURN CASE COALESCE(v_plan, 'basic')
    WHEN 'essential' THEN 6
    WHEN 'standard' THEN 4
    WHEN 'premium' THEN 0
    ELSE 15
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Libération escrow avec déduction commission
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

  IF pl.order_status NOT IN ('completed', 'validated') THEN
    RETURN json_build_object('success', false, 'error', 'La commande doit être terminée par le prestataire');
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
    auto_validated = (p_actor_type = 'system')
  WHERE link_id = p_link_id;

  INSERT INTO public.order_timeline (payment_link_id, status, action, description, actor_type)
  VALUES (
    pl.id,
    'validated',
    CASE WHEN p_actor_type = 'system' THEN 'Validation automatique' ELSE 'Validation client' END,
    CASE WHEN p_actor_type = 'system'
      THEN 'Fonds libérés automatiquement après délai de grâce (commission ' || v_rate || '%)'
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

-- Validation client
CREATE OR REPLACE FUNCTION public.validate_order(link_id_param TEXT)
RETURNS JSON AS $$
BEGIN
  RETURN public.release_escrow_for_order(link_id_param, 'client');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Finalisation prestataire + délai auto-release (72h)
CREATE OR REPLACE FUNCTION public.complete_order(link_id_param TEXT)
RETURNS JSON AS $$
DECLARE
  pl RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT * INTO pl FROM public.payment_links
  WHERE link_id = link_id_param AND provider_id = auth.uid();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Commande non trouvée');
  END IF;

  IF pl.order_status != 'started' THEN
    RETURN json_build_object('success', false, 'error', 'La commande doit être démarrée');
  END IF;

  UPDATE public.payment_links SET
    order_status = 'completed',
    completed_at = NOW(),
    auto_release_at = NOW() + INTERVAL '72 hours'
  WHERE link_id = link_id_param;

  RETURN json_build_object(
    'success', true,
    'message', 'Commande finalisée. Le client a 72h pour valider avant libération automatique.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-release (à appeler via cron Supabase ou au chargement client)
CREATE OR REPLACE FUNCTION public.process_auto_escrow_releases()
RETURNS JSON AS $$
DECLARE
  r RECORD;
  v_count INT := 0;
  v_result JSON;
BEGIN
  FOR r IN
    SELECT link_id FROM public.payment_links
    WHERE order_status = 'completed'
      AND escrow_released = false
      AND auto_release_at IS NOT NULL
      AND auto_release_at <= NOW()
  LOOP
    v_result := public.release_escrow_for_order(r.link_id, 'system');
    IF (v_result->>'success')::boolean THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN json_build_object('success', true, 'processed', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Timeline publique (client sans compte)
CREATE OR REPLACE FUNCTION public.get_order_timeline(link_id_param TEXT)
RETURNS SETOF public.order_timeline AS $$
BEGIN
  RETURN QUERY
  SELECT ot.*
  FROM public.order_timeline ot
  JOIN public.payment_links pl ON pl.id = ot.payment_link_id
  WHERE pl.link_id = link_id_param
  ORDER BY ot.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_order_timeline(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_order(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_auto_escrow_releases() TO anon, authenticated;

-- Support client lié à une commande (sans auth obligatoire)
CREATE OR REPLACE FUNCTION public.create_order_support(
  payment_link_id_param UUID,
  client_name_param TEXT,
  client_phone_param TEXT,
  initial_message_param TEXT,
  message_type_param TEXT DEFAULT 'text',
  attachment_url_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  conv_id UUID;
  msg_id UUID;
BEGIN
  SELECT id INTO conv_id FROM public.support_conversations
  WHERE payment_link_id = payment_link_id_param AND status = 'open'
  LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO public.support_conversations (
      user_id, subject, status, payment_link_id, client_name, client_phone, created_at, updated_at
    ) VALUES (
      NULL,
      'Support commande ' || LEFT(payment_link_id_param::text, 8),
      'open',
      payment_link_id_param,
      client_name_param,
      client_phone_param,
      NOW(),
      NOW()
    ) RETURNING id INTO conv_id;
  END IF;

  INSERT INTO public.support_messages (
    conversation_id, sender_type, sender_id, message, message_type, attachment_url, created_at
  ) VALUES (
    conv_id, 'client', NULL, initial_message_param, message_type_param, attachment_url_param, NOW()
  ) RETURNING id INTO msg_id;

  UPDATE public.support_conversations SET updated_at = NOW() WHERE id = conv_id;

  RETURN json_build_object('success', true, 'conversation_id', conv_id, 'message_id', msg_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.send_order_support_message(
  conversation_id_param UUID,
  content_param TEXT,
  message_type_param TEXT DEFAULT 'text',
  attachment_url_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  msg_id UUID;
BEGIN
  INSERT INTO public.support_messages (
    conversation_id, sender_type, sender_id, message, message_type, attachment_url, created_at
  ) VALUES (
    conversation_id_param, 'client', NULL, content_param, message_type_param, attachment_url_param, NOW()
  ) RETURNING id INTO msg_id;

  UPDATE public.support_conversations SET updated_at = NOW() WHERE id = conversation_id_param;

  RETURN json_build_object('success', true, 'message_id', msg_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_order_support(payment_link_id_param UUID)
RETURNS JSON AS $$
DECLARE
  conv RECORD;
  msgs JSON;
BEGIN
  SELECT * INTO conv FROM public.support_conversations
  WHERE payment_link_id = payment_link_id_param
  ORDER BY created_at DESC LIMIT 1;

  IF conv IS NULL THEN
    RETURN json_build_object('success', true, 'conversation', NULL);
  END IF;

  SELECT json_agg(row_to_json(m) ORDER BY m.created_at ASC) INTO msgs
  FROM public.support_messages m WHERE m.conversation_id = conv.id;

  RETURN json_build_object(
    'success', true,
    'conversation', json_build_object(
      'id', conv.id,
      'status', conv.status,
      'created_at', conv.created_at,
      'messages', COALESCE(msgs, '[]'::json)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_order_support(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_order_support_message(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_support(UUID) TO anon, authenticated;

-- Résolution litige admin enrichie
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  dispute_id_param UUID,
  decision_param TEXT,
  resolution_notes_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  d RECORD;
  pl RECORD;
BEGIN
  SELECT * INTO d FROM public.disputes WHERE id = dispute_id_param;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Litige introuvable');
  END IF;

  SELECT * INTO pl FROM public.payment_links WHERE id = d.payment_link_id;

  UPDATE public.disputes SET
    status = 'resolved',
    resolution = resolution_notes_param,
    resolution_type = decision_param,
    admin_notes = resolution_notes_param,
    resolved_at = NOW()
  WHERE id = dispute_id_param;

  IF decision_param = 'refund_client' THEN
    UPDATE public.payment_links SET
      order_status = 'cancelled',
      status = 'cancelled',
      refunded = true,
      refunded_at = NOW(),
      escrow_released = false
    WHERE id = d.payment_link_id;
  ELSIF decision_param = 'pay_provider' AND pl.link_id IS NOT NULL THEN
    PERFORM public.release_escrow_for_order(pl.link_id, 'admin');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Litige résolu');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(UUID, TEXT, TEXT) TO authenticated;
