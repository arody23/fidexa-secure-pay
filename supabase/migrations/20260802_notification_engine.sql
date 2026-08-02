-- Moteur de notifications centralisé (templates + logs + OTP accès commande)

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'email', 'sms', 'push')),
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  variables TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  recipient TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created
  ON public.notification_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_event
  ON public.notification_logs (event_type);

CREATE TABLE IF NOT EXISTS public.order_access_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_link_id UUID NOT NULL REFERENCES public.payment_links(id) ON DELETE CASCADE,
  link_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_access_otps_link
  ON public.order_access_otps (link_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_link_id UUID NOT NULL REFERENCES public.payment_links(id) ON DELETE CASCADE,
  link_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_access_sessions_link
  ON public.order_access_sessions (link_id);

-- Seed templates (aucun texte métier dans le code applicatif)
INSERT INTO public.notification_templates (event_type, category, name, description, channel, body, variables)
VALUES
  (
    'payment.completed',
    'paiement',
    'Paiement reçu',
    'Envoyé au client après paiement réussi',
    'whatsapp',
    'Bonjour {{client_name}}, votre paiement de {{amount}} {{currency}} a bien été reçu sur FidexaPay. Réf: {{order_reference}}. Suivez votre commande: {{tracking_link}}',
    ARRAY['client_name','amount','currency','order_reference','tracking_link','date','time']
  ),
  (
    'payment.failed',
    'paiement',
    'Paiement échoué',
    'Envoyé au client si le paiement échoue',
    'whatsapp',
    'Bonjour {{client_name}}, votre paiement FidexaPay a échoué. Vous pouvez réessayer ici: {{payment_link}}',
    ARRAY['client_name','payment_link','amount','currency']
  ),
  (
    'order.created',
    'commande',
    'Nouvelle commande',
    'Envoyé au prestataire quand une commande est payée',
    'whatsapp',
    'Nouvelle commande FidexaPay: {{amount}} {{currency}} — {{order_reference}}. Client: {{client_name}}.',
    ARRAY['merchant_name','client_name','amount','currency','order_reference']
  ),
  (
    'order.accepted',
    'commande',
    'Commande acceptée',
    'Prestataire a commencé le travail',
    'whatsapp',
    'Bonjour {{client_name}}, {{merchant_name}} a commencé votre commande {{order_reference}}. Suivi: {{tracking_link}}',
    ARRAY['client_name','merchant_name','order_reference','tracking_link']
  ),
  (
    'order.completed',
    'commande',
    'Commande terminée',
    'Prestataire a marqué la commande comme terminée',
    'whatsapp',
    'Bonjour {{client_name}}, votre commande {{order_reference}} est terminée. Validez la réception ici: {{tracking_link}}',
    ARRAY['client_name','order_reference','tracking_link']
  ),
  (
    'otp.order_access',
    'otp',
    'OTP accès suivi commande',
    'Code pour accéder à la page de suivi après paiement',
    'whatsapp',
    'FidexaPay — votre code d''accès au suivi de commande est *{{otp}}*. Valable {{otp_minutes}} minutes. Ne le partagez avec personne.',
    ARRAY['otp','otp_minutes','client_name','order_reference','tracking_link']
  ),
  (
    'otp.expired',
    'otp',
    'OTP expiré',
    'Information si l''utilisateur demande un nouveau code',
    'whatsapp',
    'Votre précédent code FidexaPay a expiré. Un nouveau code vous a été envoyé.',
    ARRAY['client_name','order_reference']
  ),
  (
    'escrow.released',
    'escrow',
    'Fonds libérés',
    'Fonds libérés au prestataire',
    'whatsapp',
    'Les fonds de la commande {{order_reference}} ({{amount}} {{currency}}) ont été libérés.',
    ARRAY['merchant_name','client_name','amount','currency','order_reference']
  ),
  (
    'refund.requested',
    'remboursement',
    'Demande de remboursement',
    'Nouvelle demande de remboursement',
    'whatsapp',
    'Demande de remboursement pour {{order_reference}} ({{amount}} {{currency}}).',
    ARRAY['order_reference','amount','currency','client_name','merchant_name']
  ),
  (
    'dispute.opened',
    'litige',
    'Litige ouvert',
    'Un litige a été ouvert',
    'whatsapp',
    'Un litige a été ouvert sur la commande {{order_reference}}. FidexaPay vous tiendra informé.',
    ARRAY['order_reference','client_name','merchant_name']
  ),
  (
    'dispute.resolved',
    'litige',
    'Litige résolu',
    'Litige clos',
    'whatsapp',
    'Le litige sur la commande {{order_reference}} a été résolu.',
    ARRAY['order_reference','client_name','merchant_name']
  )
ON CONFLICT (event_type) DO NOTHING;

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_access_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_access_sessions ENABLE ROW LEVEL SECURITY;

-- Lecture templates pour admins authentifiés
DROP POLICY IF EXISTS notification_templates_admin_all ON public.notification_templates;
CREATE POLICY notification_templates_admin_all ON public.notification_templates
  FOR ALL TO authenticated
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

DROP POLICY IF EXISTS notification_logs_admin_select ON public.notification_logs;
CREATE POLICY notification_logs_admin_select ON public.notification_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (u.is_admin = true OR u.role = 'admin')
    )
  );

NOTIFY pgrst, 'reload schema';
