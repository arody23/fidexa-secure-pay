-- Schéma réel prod: pas de client_name/email/phone sur disputes;
-- raised_by était NOT NULL (bloquant les litiges clients anonymes OTP).
ALTER TABLE public.disputes
  ALTER COLUMN raised_by DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.create_dispute(
  link_id_param TEXT,
  reason_param TEXT,
  description_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  pl RECORD;
  d_id UUID;
  existing_id UUID;
BEGIN
  SELECT * INTO pl FROM public.payment_links WHERE link_id = link_id_param;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

  IF COALESCE(pl.is_paid, false) IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Paiement non confirmé');
  END IF;

  IF pl.order_status IN ('validated', 'cancelled', 'disputed') THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Impossible d''ouvrir un litige (statut: %s)', pl.order_status)
    );
  END IF;

  SELECT id INTO existing_id
  FROM public.disputes
  WHERE payment_link_id = pl.id AND status = 'open'
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'dispute_id', existing_id,
      'message', 'Un litige est déjà ouvert',
      'alreadyOpen', true
    );
  END IF;

  INSERT INTO public.disputes (
    payment_link_id, reason, description, status
  ) VALUES (
    pl.id,
    reason_param,
    description_param,
    'open'
  ) RETURNING id INTO d_id;

  UPDATE public.payment_links
  SET order_status = 'disputed'
  WHERE id = pl.id;

  INSERT INTO public.order_timeline (payment_link_id, status, action, description, actor_type)
  VALUES (
    pl.id,
    'disputed',
    'Litige ouvert',
    COALESCE(reason_param, 'Litige client'),
    'client'
  );

  RETURN json_build_object(
    'success', true,
    'dispute_id', d_id,
    'message', 'Litige ouvert. FidexaPay va examiner le dossier.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_dispute(TEXT, TEXT, TEXT) TO anon, authenticated;
