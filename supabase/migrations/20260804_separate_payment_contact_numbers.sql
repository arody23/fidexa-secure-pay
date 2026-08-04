-- Separate the number used to debit Mobile Money from the WhatsApp OTP recipient.
ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS client_country CHAR(2),
  ADD COLUMN IF NOT EXISTS client_momo_phone TEXT;

-- Existing links used one number for both flows. Preserve that behaviour until
-- the client supplies distinct values during checkout.
UPDATE public.payment_links
SET client_momo_phone = client_phone
WHERE client_momo_phone IS NULL
  AND client_phone IS NOT NULL;

COMMENT ON COLUMN public.payment_links.client_country IS
  'ISO 3166-1 alpha-2 country selected for the payer; editable at checkout.';
COMMENT ON COLUMN public.payment_links.client_momo_phone IS
  'Mobile Money number used exclusively for KPay payment initiation.';
COMMENT ON COLUMN public.payment_links.client_phone IS
  'WhatsApp number used exclusively for order-access OTP and notifications.';
