-- Opt-in newsletter WhatsApp + campagnes marketing (média / CTA)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  media_url text,
  media_type text NOT NULL DEFAULT 'none'
    CHECK (media_type IN ('none', 'image', 'video', 'document')),
  button_label text,
  button_url text,
  audience text NOT NULL DEFAULT 'opted_in'
    CHECK (audience IN ('opted_in', 'all_providers', 'one')),
  target_user_id uuid,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'queued', 'sent', 'failed')),
  queued_count int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_created
  ON public.whatsapp_campaigns (created_at DESC);

ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_campaigns_admin_all ON public.whatsapp_campaigns;
CREATE POLICY whatsapp_campaigns_admin_all
  ON public.whatsapp_campaigns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (u.is_admin = true OR u.role = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (u.is_admin = true OR u.role = 'admin')
    )
  );

INSERT INTO public.notification_templates (
  event_type, category, name, description, channel, body, variables
)
VALUES
  (
    'provider.welcome',
    'onboarding',
    'Bienvenue prestataire',
    'Envoyé juste après la création du compte prestataire',
    'whatsapp',
    'Bienvenue sur FidexaPay 👋

Votre compte prestataire est prêt. Créez votre premier lien de paiement sécurisé et envoyez-le à vos clients.

Dashboard : {{dashboard_url}}

Besoin d''aide ? Répondez à ce message.',
    ARRAY['dashboard_url', 'email', 'country']
  ),
  (
    'marketing.campaign',
    'marketing',
    'Campagne WhatsApp',
    'Offres / newsletters personnalisées (texte, média, bouton)',
    'whatsapp',
    '{{message}}{{cta_block}}',
    ARRAY['message', 'cta_block', 'campaign_title', 'button_label', 'button_url']
  )
ON CONFLICT (event_type) DO UPDATE SET
  body = EXCLUDED.body,
  description = EXCLUDED.description,
  variables = EXCLUDED.variables,
  updated_at = now();
