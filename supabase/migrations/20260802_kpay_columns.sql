-- KPay (Mobile Money) — remplace GeniusPay

-- payment_links
ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS kpay_reference TEXT,
  ADD COLUMN IF NOT EXISTS kpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS kpay_status TEXT,
  ADD COLUMN IF NOT EXISTS kpay_checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS kpay_amount NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS kpay_fees NUMERIC(15, 2);

CREATE INDEX IF NOT EXISTS idx_payment_links_kpay_reference
  ON public.payment_links (kpay_reference)
  WHERE kpay_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_links_kpay_payment_id
  ON public.payment_links (kpay_payment_id)
  WHERE kpay_payment_id IS NOT NULL;

-- withdrawals
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS kpay_payout_reference TEXT,
  ADD COLUMN IF NOT EXISTS kpay_payout_id TEXT,
  ADD COLUMN IF NOT EXISTS kpay_payout_status TEXT,
  ADD COLUMN IF NOT EXISTS kpay_payout_fees NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS kpay_amount NUMERIC(15, 2);

-- Élargir payout_mode : manual | geniuspay | kpay
ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_payout_mode_check;
ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_payout_mode_check
  CHECK (payout_mode IS NULL OR payout_mode IN ('manual', 'geniuspay', 'kpay'));

CREATE INDEX IF NOT EXISTS idx_withdrawals_kpay_payout_ref
  ON public.withdrawals (kpay_payout_reference)
  WHERE kpay_payout_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_withdrawals_kpay_payout_id
  ON public.withdrawals (kpay_payout_id)
  WHERE kpay_payout_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
