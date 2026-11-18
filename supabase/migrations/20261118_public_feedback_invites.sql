-- Avis publics type Google Review + invitations WhatsApp post-prestation
ALTER TABLE public.provider_testimonials
  ADD COLUMN IF NOT EXISTS author_type text NOT NULL DEFAULT 'provider'
    CHECK (author_type IN ('provider', 'client')),
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS payment_link_id uuid REFERENCES public.payment_links(id) ON DELETE SET NULL;

ALTER TABLE public.provider_testimonials
  ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.feedback_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  payment_link_id uuid NOT NULL REFERENCES public.payment_links(id) ON DELETE CASCADE,
  audience text NOT NULL CHECK (audience IN ('client', 'provider')),
  recipient_phone text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_invites_token ON public.feedback_invites(token);
CREATE INDEX IF NOT EXISTS idx_feedback_invites_link ON public.feedback_invites(payment_link_id);

ALTER TABLE public.feedback_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.submit_public_feedback(
  token_param text,
  rating_param integer,
  content_param text,
  display_name_param text DEFAULT NULL,
  profession_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.feedback_invites%ROWTYPE;
  pl public.payment_links%ROWTYPE;
  clean_content text := trim(content_param);
  clean_name text := nullif(trim(COALESCE(display_name_param, '')), '');
  clean_prof text := nullif(trim(COALESCE(profession_param, '')), '');
BEGIN
  IF rating_param IS NULL OR rating_param < 1 OR rating_param > 5 THEN
    RETURN json_build_object('success', false, 'error', 'Note invalide');
  END IF;
  IF length(clean_content) < 12 THEN
    RETURN json_build_object('success', false, 'error', 'Message trop court');
  END IF;

  SELECT * INTO inv FROM public.feedback_invites WHERE token = token_param LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Lien invalide ou expiré');
  END IF;
  IF inv.consumed_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Avis déjà envoyé pour ce lien');
  END IF;
  IF inv.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Lien expiré');
  END IF;
  IF inv.audience <> 'client' THEN
    RETURN json_build_object('success', false, 'error', 'Ce lien est réservé au client');
  END IF;

  SELECT * INTO pl FROM public.payment_links WHERE id = inv.payment_link_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

  INSERT INTO public.provider_testimonials (
    user_id, content, rating, status, author_type, display_name, profession, payment_link_id
  ) VALUES (
    NULL, clean_content, rating_param, 'pending', 'client',
    COALESCE(clean_name, pl.client_name, 'Client'),
    clean_prof, pl.id
  );

  UPDATE public.feedback_invites SET consumed_at = now() WHERE id = inv.id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_feedback(text, integer, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_feedback_invites(payment_link_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pl public.payment_links%ROWTYPE;
  client_token text := encode(gen_random_bytes(18), 'hex');
  provider_token text := encode(gen_random_bytes(18), 'hex');
BEGIN
  SELECT * INTO pl FROM public.payment_links WHERE id = payment_link_id_param;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Lien introuvable');
  END IF;

  DELETE FROM public.feedback_invites
  WHERE payment_link_id = pl.id AND consumed_at IS NULL;

  INSERT INTO public.feedback_invites (token, payment_link_id, audience, recipient_phone)
  VALUES
    (client_token, pl.id, 'client', pl.client_phone),
    (provider_token, pl.id, 'provider', NULL);

  RETURN json_build_object(
    'success', true,
    'client_token', client_token,
    'provider_token', provider_token,
    'client_phone', pl.client_phone,
    'provider_id', pl.provider_id,
    'link_id', pl.link_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_feedback_invites(uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_approved_testimonials();
CREATE OR REPLACE FUNCTION public.get_approved_testimonials()
RETURNS TABLE (
  id uuid,
  content text,
  rating integer,
  full_name text,
  avatar_url text,
  country text,
  profession text,
  author_type text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.content,
    t.rating,
    COALESCE(t.display_name, u.full_name, 'Client FidexaPay') AS full_name,
    u.avatar_url,
    u.country,
    t.profession,
    COALESCE(t.author_type, 'provider') AS author_type,
    t.created_at
  FROM public.provider_testimonials t
  LEFT JOIN public.users u ON u.id = t.user_id
  WHERE t.status = 'approved'
  ORDER BY t.reviewed_at DESC NULLS LAST, t.created_at DESC
  LIMIT 40;
$$;

INSERT INTO public.notification_templates (event_type, category, name, description, channel, body, variables)
VALUES (
  'feedback.invite',
  'feedback',
  'Invitation avis',
  'Invitation avis post-prestation (client / prestataire)',
  'whatsapp',
  'FidexaPay — Merci pour votre confiance sur la commande {{order_reference}}. Partagez votre avis en 30 secondes : {{feedback_url}}',
  ARRAY['order_reference', 'feedback_url', 'client_name', 'merchant_name']
)
ON CONFLICT (event_type) DO UPDATE
SET body = EXCLUDED.body,
    description = EXCLUDED.description,
    variables = EXCLUDED.variables,
    updated_at = NOW();
