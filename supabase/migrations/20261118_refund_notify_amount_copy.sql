-- Clarifier les montants notifiés : toujours devise commande (ex. 0.85 USD), jamais montant opérateur CDF.
UPDATE public.notification_templates
SET
  body = 'FidexaPay — Bonjour {{client_name}}, votre remboursement de {{amount}} {{currency}} pour la commande {{order_reference}} a été confirmé sur votre Mobile Money. Merci de votre confiance.',
  updated_at = NOW()
WHERE event_type = 'refund.completed';

UPDATE public.notification_templates
SET
  body = 'FidexaPay — Bonjour {{client_name}}, un remboursement de {{amount}} {{currency}} a été initié pour la commande {{order_reference}}, conformément à notre politique. Les fonds arriveront sur votre Mobile Money après confirmation de l’opérateur.',
  updated_at = NOW()
WHERE event_type = 'refund.requested';
