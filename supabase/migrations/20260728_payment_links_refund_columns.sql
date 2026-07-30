-- Colonnes remboursement manquantes sur payment_links

ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
