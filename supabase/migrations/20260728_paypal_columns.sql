-- Colonnes PayPal pour payment_links

ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS paypal_order_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_capture_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_status TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS paypal_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS paypal_currency TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_links_paypal_order_id
  ON public.payment_links (paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;
