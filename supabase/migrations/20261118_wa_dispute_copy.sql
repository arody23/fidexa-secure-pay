UPDATE public.notification_templates
SET
  body = 'FidexaPay — Un litige a été ouvert sur la commande {{order_reference}}. Notre équipe examine le dossier conformément à la politique de litiges. Vous serez informé de la décision.',
  description = 'Client et prestataire — ouverture de litige',
  updated_at = NOW()
WHERE event_type = 'dispute.opened';

UPDATE public.notification_templates
SET
  body = 'FidexaPay — Décision sur la commande {{order_reference}} : {{decision_label}}. {{resolution_notes}} Merci de vous référer à notre politique de litiges pour plus de détails.',
  description = 'Client et prestataire — décision de litige (formulation pro)',
  updated_at = NOW()
WHERE event_type = 'dispute.resolved';

UPDATE public.notification_templates
SET
  body = 'FidexaPay — Bonjour {{client_name}}, un remboursement de {{amount}} {{currency}} a été initié pour la commande {{order_reference}}, conformément à notre politique. Vous recevrez les fonds sur votre Mobile Money après confirmation de l’opérateur.',
  updated_at = NOW()
WHERE event_type = 'refund.requested';

UPDATE public.notification_templates
SET
  body = 'FidexaPay — Bonjour {{client_name}}, votre remboursement de {{amount}} {{currency}} pour la commande {{order_reference}} a été confirmé. Merci de votre confiance.',
  updated_at = NOW()
WHERE event_type = 'refund.completed';

-- Timeline : masquer le bruit « Changement automatique » côté client via filtre front ;
-- clarifier les libellés admin déjà présents.
UPDATE public.order_timeline
SET description = replace(description, 'Admin:', 'FidexaPay :')
WHERE description ILIKE 'Admin:%';
