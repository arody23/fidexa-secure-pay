-- GeniusPay (Mobile Money) — colonnes sur payment_links

ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS geniuspay_reference TEXT,
  ADD COLUMN IF NOT EXISTS geniuspay_payment_id BIGINT,
  ADD COLUMN IF NOT EXISTS geniuspay_status TEXT,
  ADD COLUMN IF NOT EXISTS geniuspay_checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS geniuspay_amount_xof NUMERIC(12, 0),
  ADD COLUMN IF NOT EXISTS geniuspay_fees NUMERIC(12, 2);

CREATE INDEX IF NOT EXISTS idx_payment_links_geniuspay_reference
  ON public.payment_links (geniuspay_reference)
  WHERE geniuspay_reference IS NOT NULL;

NOTIFY pgrst, 'reload schema';
