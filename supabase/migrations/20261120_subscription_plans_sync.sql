-- Aligner subscription_plans (legacy) sur les plans FidexaPay actuels
UPDATE public.subscription_plans
SET
  display_name = 'Basique',
  price = 0,
  commission_rate = 9,
  features = ARRAY[
    '5 liens de paiement actifs',
    'Commission 9 %',
    'Validité des liens : 7 jours',
    'Plafond 500 USD / transaction'
  ],
  updated_at = now()
WHERE name = 'basic';

UPDATE public.subscription_plans
SET
  display_name = 'Essentiel',
  price = 29,
  commission_rate = 6,
  features = ARRAY[
    '25 liens de paiement actifs',
    'Commission 6 %',
    'Validité des liens : 30 jours',
    'Plafond 3 000 USD / transaction'
  ],
  updated_at = now()
WHERE name = 'essential';

UPDATE public.subscription_plans
SET
  display_name = 'Premium',
  price = 69,
  commission_rate = 4,
  features = ARRAY[
    'Liens de paiement illimités',
    'Commission 4 %',
    'Validité des liens : 90 jours',
    'Plafond 15 000 USD / transaction'
  ],
  is_active = true,
  updated_at = now()
WHERE name = 'premium';

-- Ancien « standard » (4 %) : désactiver pour éviter la confusion
UPDATE public.subscription_plans
SET is_active = false, updated_at = now()
WHERE name = 'standard';

-- Assouplir plan_id si besoin de lignes sans catalogue (filet de sécurité)
ALTER TABLE public.subscriptions
  ALTER COLUMN plan_id DROP NOT NULL;

ALTER TABLE public.subscriptions
  ALTER COLUMN end_date DROP NOT NULL;

ALTER TABLE public.subscriptions
  ALTER COLUMN commission_rate DROP NOT NULL;

ALTER TABLE public.subscriptions
  ALTER COLUMN plan_name DROP NOT NULL;
