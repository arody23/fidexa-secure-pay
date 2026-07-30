-- Colonnes GeniusPay Payout sur les retraits

ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS geniuspay_payout_reference TEXT,
  ADD COLUMN IF NOT EXISTS geniuspay_payout_id TEXT,
  ADD COLUMN IF NOT EXISTS geniuspay_payout_status TEXT,
  ADD COLUMN IF NOT EXISTS geniuspay_payout_fees NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS geniuspay_amount_xof NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS payout_mode TEXT DEFAULT 'manual'
    CHECK (payout_mode IN ('manual', 'geniuspay'));

CREATE INDEX IF NOT EXISTS idx_withdrawals_geniuspay_payout_ref
  ON public.withdrawals(geniuspay_payout_reference)
  WHERE geniuspay_payout_reference IS NOT NULL;

NOTIFY pgrst, 'reload schema';
