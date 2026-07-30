-- Expiration des liens non payés après 7 jours
ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Liens en attente existants : expiration à J+7 depuis création
UPDATE public.payment_links
SET expires_at = created_at + INTERVAL '7 days'
WHERE is_paid = false AND expires_at IS NULL;

-- Liens déjà payés : pas d'expiration
UPDATE public.payment_links
SET expires_at = NULL
WHERE is_paid = true;
