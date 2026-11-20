-- Templates WhatsApp — cycle de vie abonnements FidexaPay

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
    'subscription.purchased',
    'abonnement',
    'Abonnement activé',
    'Envoyé au prestataire après paiement Mobile Money confirmé',
    'whatsapp',
    'FidexaPay — Abonnement {{plan_name}} activé ({{cycle}}). Montant : {{amount_usd}} USD. Valide jusqu''au {{expires_at}}.',
    ARRAY['plan_name', 'cycle', 'amount_usd', 'expires_at']
  ),
  (
    'subscription.expired',
    'abonnement',
    'Abonnement épuisé',
    'Envoyé quand la période payante est terminée',
    'whatsapp',
    'FidexaPay — Votre abonnement {{plan_name}} est épuisé. Vous êtes repassé sur Basique (9 %). Renouvelez dans l''app.',
    ARRAY['plan_name']
  ),
  (
    'subscription.cancelled',
    'abonnement',
    'Abonnement annulé',
    'Envoyé après annulation volontaire',
    'whatsapp',
    'FidexaPay — Abonnement {{plan_name}} annulé. Vous êtes sur le plan Basique. Merci {{provider_name}}.',
    ARRAY['plan_name', 'provider_name']
  ),
  (
    'subscription.refund_requested',
    'abonnement',
    'Demande de remboursement abonnement',
    'Accusé de réception demande remboursement plan',
    'whatsapp',
    'FidexaPay — Demande de remboursement reçue pour {{plan_name}} ({{amount_usd}} USD). Notre équipe vous recontacte ici.',
    ARRAY['plan_name', 'amount_usd']
  )
ON CONFLICT (event_type) DO UPDATE SET
  body = EXCLUDED.body,
  description = EXCLUDED.description,
  variables = EXCLUDED.variables,
  updated_at = now();
