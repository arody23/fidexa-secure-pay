-- Taux de change administrables par FidexaPay (unités de devise pour 1 USD)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  currency TEXT PRIMARY KEY,
  units_per_usd NUMERIC NOT NULL CHECK (units_per_usd > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exchange_rates_select_all" ON public.exchange_rates;
CREATE POLICY "exchange_rates_select_all" ON public.exchange_rates
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "exchange_rates_admin_write" ON public.exchange_rates;
CREATE POLICY "exchange_rates_admin_write" ON public.exchange_rates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')));

-- Insertion / mise à jour idempotente des taux par défaut (modifiables par admin)
INSERT INTO public.exchange_rates (currency, units_per_usd)
VALUES
  ('USD', 1),
  ('EUR', 0.92),
  ('GBP', 0.79),
  ('XOF', 600),
  ('XAF', 600),
  ('FCFA', 600),
  ('CDF', 2294)
ON CONFLICT (currency) DO UPDATE
SET units_per_usd = EXCLUDED.units_per_usd
WHERE public.exchange_rates.units_per_usd IS DISTINCT FROM EXCLUDED.units_per_usd;

CREATE OR REPLACE FUNCTION public.get_exchange_rates()
RETURNS TABLE(currency TEXT, units_per_usd NUMERIC, updated_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.currency, r.units_per_usd, r.updated_at
  FROM public.exchange_rates r
  ORDER BY r.currency;
$$;

GRANT EXECUTE ON FUNCTION public.get_exchange_rates() TO anon, authenticated;
