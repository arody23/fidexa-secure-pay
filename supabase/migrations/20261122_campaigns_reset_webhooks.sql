-- Reset MDP WhatsApp + campagnes avancées + endpoints webhook

INSERT INTO public.notification_templates (
  event_type, category, name, description, channel, body, variables
)
VALUES
  (
    'auth.password_reset',
    'auth',
    'Réinitialisation mot de passe',
    'Lien de reset envoyé au prestataire sur WhatsApp',
    'whatsapp',
    'FidexaPay — Réinitialisation de mot de passe

Bonjour,

Ouvrez ce lien pour choisir un nouveau mot de passe (valide 1 h) :
{{reset_link}}

Si vous n''êtes pas à l''origine de cette demande, ignorez ce message.',
    ARRAY['reset_link', 'email']
  ),
  (
    'marketing.campaign',
    'marketing',
    'Campagne WhatsApp',
    'Offres / newsletters personnalisées (média + bouton)',
    'whatsapp',
    '{{message}}{{cta_block}}',
    ARRAY['message', 'cta_block', 'campaign_title', 'button_label', 'button_url']
  )
ON CONFLICT (event_type) DO UPDATE SET
  body = EXCLUDED.body,
  description = EXCLUDED.description,
  variables = EXCLUDED.variables,
  updated_at = now();

ALTER TABLE public.whatsapp_campaigns
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS automation text
    CHECK (automation IS NULL OR automation = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'monthly'::text])),
  ADD COLUMN IF NOT EXISTS preview_domain text,
  ADD COLUMN IF NOT EXISTS link_title text;

-- Assouplir le statut pour scheduled
ALTER TABLE public.whatsapp_campaigns DROP CONSTRAINT IF EXISTS whatsapp_campaigns_status_check;
ALTER TABLE public.whatsapp_campaigns
  ADD CONSTRAINT whatsapp_campaigns_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'scheduled'::text,
    'queued'::text,
    'sent'::text,
    'failed'::text,
    'cancelled'::text
  ]));

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text,
  is_active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  last_status int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_endpoints_admin_all ON public.webhook_endpoints;
CREATE POLICY webhook_endpoints_admin_all
  ON public.webhook_endpoints
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

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-media',
  'campaign-media',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS campaign_media_admin_write ON storage.objects;
CREATE POLICY campaign_media_admin_write
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'campaign-media'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (u.is_admin = true OR u.role = 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'campaign-media'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (u.is_admin = true OR u.role = 'admin')
    )
  );

DROP POLICY IF EXISTS campaign_media_public_read ON storage.objects;
CREATE POLICY campaign_media_public_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'campaign-media');
