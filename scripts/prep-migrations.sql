-- Prérequis avant migration escrow (idempotent)

CREATE TABLE IF NOT EXISTS public.order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_link_id UUID NOT NULL REFERENCES public.payment_links(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type TEXT CHECK (actor_type IN ('provider', 'client', 'admin', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_payment_link_id ON public.order_timeline(payment_link_id);
CREATE INDEX IF NOT EXISTS idx_order_timeline_created_at ON public.order_timeline(created_at DESC);

ALTER TABLE public.order_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_timeline_public_select" ON public.order_timeline;
CREATE POLICY "order_timeline_public_select"
ON public.order_timeline FOR SELECT
USING (true);

DROP POLICY IF EXISTS "order_timeline_insert" ON public.order_timeline;
CREATE POLICY "order_timeline_insert"
ON public.order_timeline FOR INSERT
WITH CHECK (true);

-- Support client anonyme (sans compte)
ALTER TABLE public.support_conversations
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.support_conversations
  DROP CONSTRAINT IF EXISTS support_conversations_user_id_fkey;

ALTER TABLE public.support_conversations
  ADD CONSTRAINT support_conversations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Étendre sender_type pour client/admin
ALTER TABLE public.support_messages
  DROP CONSTRAINT IF EXISTS support_messages_sender_type_check;

ALTER TABLE public.support_messages
  ADD CONSTRAINT support_messages_sender_type_check
  CHECK (sender_type IN ('user', 'admin', 'client'));

-- Supprimer anciennes versions des fonctions (PostgreSQL refuse de renommer les paramètres)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'start_order', 'cancel_order', 'create_dispute',
        'get_provider_commission_rate', 'release_escrow_for_order',
        'validate_order', 'complete_order', 'process_auto_escrow_releases',
        'get_order_timeline', 'create_order_support', 'send_order_support_message',
        'get_order_support', 'admin_resolve_dispute'
      )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

-- Fonctions commande de base (start / cancel / dispute)
CREATE OR REPLACE FUNCTION public.start_order(link_id_param TEXT)
RETURNS JSON AS $$
DECLARE
  pl_record RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT * INTO pl_record
  FROM public.payment_links
  WHERE link_id = link_id_param AND provider_id = auth.uid();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Commande non trouvée');
  END IF;

  IF pl_record.order_status NOT IN ('paid', 'pending') AND pl_record.is_paid = false THEN
    RETURN json_build_object('success', false, 'error', 'La commande doit être payée d''abord');
  END IF;

  UPDATE public.payment_links SET
    order_status = 'started',
    started_at = NOW(),
    can_cancel = false
  WHERE link_id = link_id_param;

  RETURN json_build_object('success', true, 'message', 'Commande démarrée');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_order(link_id_param TEXT, reason_param TEXT DEFAULT NULL)
RETURNS JSON AS $$
BEGIN
  UPDATE public.payment_links SET
    order_status = 'cancelled',
    status = 'cancelled',
    cancelled_at = NOW(),
    refunded = true,
    refunded_at = NOW()
  WHERE link_id = link_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Commande annulée', 'reason', reason_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_dispute(
  link_id_param TEXT,
  reason_param TEXT,
  description_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  pl RECORD;
  d_id UUID;
BEGIN
  SELECT * INTO pl FROM public.payment_links WHERE link_id = link_id_param;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

  INSERT INTO public.disputes (
    payment_link_id, client_name, client_email, client_phone,
    reason, description, status
  ) VALUES (
    pl.id,
    COALESCE(pl.client_name, 'Client'),
    pl.client_email,
    pl.client_phone,
    reason_param,
    description_param,
    'open'
  ) RETURNING id INTO d_id;

  UPDATE public.payment_links SET order_status = 'disputed', status = 'disputed' WHERE id = pl.id;

  RETURN json_build_object('success', true, 'dispute_id', d_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.start_order(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_dispute(TEXT, TEXT, TEXT) TO anon, authenticated;
