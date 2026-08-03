-- Suivi des remboursements confirmés par les webhooks KPay.
-- L'initiation reste manuelle côté dashboard KPay tant qu'aucun endpoint
-- public de création de remboursement n'est fourni par KPay.

ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS kpay_refund_reference TEXT,
  ADD COLUMN IF NOT EXISTS kpay_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS kpay_refund_status TEXT,
  ADD COLUMN IF NOT EXISTS kpay_refund_amount NUMERIC(15, 2);

CREATE INDEX IF NOT EXISTS idx_payment_links_kpay_refund_reference
  ON public.payment_links (kpay_refund_reference)
  WHERE kpay_refund_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_links_kpay_refund_id
  ON public.payment_links (kpay_refund_id)
  WHERE kpay_refund_id IS NOT NULL;

ALTER TABLE public.refund_requests
  DROP CONSTRAINT IF EXISTS refund_requests_status_check;

ALTER TABLE public.refund_requests
  ADD CONSTRAINT refund_requests_status_check
  CHECK (
    status IN (
      'pending',
      'awaiting_provider',
      'awaiting_client',
      'under_review',
      'approved',
      'rejected',
      'cancelled',
      'completed',
      'failed'
    )
  );

INSERT INTO public.notification_templates (
  event_type,
  category,
  name,
  description,
  channel,
  body,
  variables
)
VALUES
  (
    'refund.completed',
    'remboursement',
    'Remboursement effectué',
    'Envoyé au client après confirmation du remboursement par KPay',
    'whatsapp',
    'Bonjour {{client_name}}, votre remboursement de {{amount}} {{currency}} a été effectué. Réf: {{order_reference}}.',
    ARRAY['client_name', 'amount', 'currency', 'order_reference', 'transaction_id', 'date', 'time']
  ),
  (
    'refund.failed',
    'remboursement',
    'Remboursement non abouti',
    'Envoyé au client si KPay refuse ou annule le remboursement',
    'whatsapp',
    'Bonjour {{client_name}}, votre remboursement pour la commande {{order_reference}} n''a pas abouti. Contactez le support FidexaPay.',
    ARRAY['client_name', 'order_reference', 'amount', 'currency', 'transaction_id', 'date', 'time']
  )
ON CONFLICT (event_type) DO NOTHING;

-- L'approbation Fidexa autorise le remboursement manuel dans KPay, mais ne
-- doit pas le présenter comme effectué avant le webhook refund.completed.
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
  WHERE id = v_req.id;

  IF decision_param = 'approved' THEN
    UPDATE public.payment_links SET
      order_status = 'cancelled',
      status = 'cancelled',
      cancelled_at = now(),
      refunded = false,
      refunded_at = NULL,
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

NOTIFY pgrst, 'reload schema';
