-- Colonnes requises par get_provider_commission_rate (validate_order / release escrow)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2);

UPDATE public.users
SET subscription_plan = COALESCE(subscription_plan, 'basic')
WHERE subscription_plan IS NULL;

NOTIFY pgrst, 'reload schema';
