-- Copier dans Supabase SQL Editor si besoin
ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.payment_links
SET expires_at = created_at + INTERVAL '7 days'
WHERE is_paid = false AND expires_at IS NULL;

UPDATE public.payment_links
SET expires_at = NULL
WHERE is_paid = true;
