-- Plans FidexaPay (basique / essentiel / premium)
-- Non destructif : liens existants gardent 15 % ; nouveaux liens → 9 % via plan/config.
-- Source de vérité applicative : src/lib/plans.ts

-- ---------------------------------------------------------------------------
-- 1) Prestataire (users)
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan TEXT,
  ADD COLUMN IF NOT EXISTS plan_billing_cycle TEXT,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_grace_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS override_max_transaction_usd NUMERIC(12,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_plan_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_plan_check
      CHECK (plan IS NULL OR plan IN ('basique', 'essentiel', 'premium'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_plan_billing_cycle_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_plan_billing_cycle_check
      CHECK (
        plan_billing_cycle IS NULL
        OR plan_billing_cycle IN ('monthly', 'yearly')
      );
  END IF;
END $$;

-- Mapper legacy anglais → IDs FR, puis défaut basique (MVP actuel = un seul plan)
UPDATE public.users
SET plan = CASE lower(COALESCE(plan, subscription_plan, subscription_type, 'basique'))
  WHEN 'essential' THEN 'essentiel'
  WHEN 'essentiel' THEN 'essentiel'
  WHEN 'standard' THEN 'premium'
  WHEN 'premium' THEN 'premium'
  WHEN 'basic' THEN 'basique'
  WHEN 'basique' THEN 'basique'
  ELSE 'basique'
END;

UPDATE public.users
SET
  subscription_plan = plan,
  subscription_type = plan
WHERE plan IS NOT NULL;

-- Défaut colonne pour les nouveaux comptes
ALTER TABLE public.users
  ALTER COLUMN plan SET DEFAULT 'basique';

-- ---------------------------------------------------------------------------
-- 2) Figer les liens EXISTANTS à 15 % (avant passage Basique → 9 %)
-- ---------------------------------------------------------------------------
UPDATE public.payment_links
SET commission_rate = 15
WHERE commission_rate IS NULL;

-- ---------------------------------------------------------------------------
-- 3) Snapshot + fee client + moyen de paiement (nouveaux champs)
-- ---------------------------------------------------------------------------
ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS plan_at_creation TEXT,
  ADD COLUMN IF NOT EXISTS client_fee_rate NUMERIC(8,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_fee_amount NUMERIC(12,2) DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_links_plan_at_creation_check'
  ) THEN
    ALTER TABLE public.payment_links
      ADD CONSTRAINT payment_links_plan_at_creation_check
      CHECK (
        plan_at_creation IS NULL
        OR plan_at_creation IN ('basique', 'essentiel', 'premium')
      );
  END IF;
END $$;

-- payment_method existe déjà ; valeurs historiques (kpay, paypal, …) conservées.
-- Nouveaux flux : mobile_money | card (pas de rewrite destructif ici).

-- Prestataires basique : commission user → 9 % pour les FUTURS liens
-- (les liens déjà figés à 15 % ci-dessus ne sont pas recalculés)
UPDATE public.users
SET commission_rate = 9
WHERE COALESCE(plan, 'basique') = 'basique'
  AND (commission_rate IS NULL OR commission_rate = 15);

UPDATE public.users
SET commission_rate = 6
WHERE plan = 'essentiel'
  AND (commission_rate IS NULL OR commission_rate IN (15, 6));

UPDATE public.users
SET commission_rate = 4
WHERE plan = 'premium'
  AND (commission_rate IS NULL OR commission_rate IN (0, 4, 15));

-- ---------------------------------------------------------------------------
-- 4) Historique abonnements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('basique', 'essentiel', 'premium')),
  cycle TEXT CHECK (cycle IS NULL OR cycle IN ('monthly', 'yearly')),
  amount_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  payment_ref TEXT,
  paid_at TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  source TEXT
    CHECK (source IS NULL OR source IN ('direct', 'deducted_from_earnings')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON public.subscriptions (status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS subscriptions_service_all ON public.subscriptions;
-- Pas de INSERT/UPDATE client direct : Edge Functions (service role) uniquement.

-- ---------------------------------------------------------------------------
-- 5) get_provider_commission_rate — nouveaux IDs + taux
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_provider_commission_rate(p_provider_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_plan TEXT;
  v_rate NUMERIC;
BEGIN
  SELECT COALESCE(plan, subscription_plan, subscription_type), commission_rate
  INTO v_plan, v_rate
  FROM public.users WHERE id = p_provider_id;

  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  v_plan := lower(COALESCE(v_plan, 'basique'));
  -- Alias legacy anglais
  IF v_plan = 'basic' THEN v_plan := 'basique'; END IF;
  IF v_plan = 'essential' THEN v_plan := 'essentiel'; END IF;
  IF v_plan = 'standard' THEN v_plan := 'premium'; END IF;

  RETURN CASE v_plan
    WHEN 'essentiel' THEN 6
    WHEN 'premium' THEN 4
    ELSE 9
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 6) release_escrow — préférer le snapshot commission_rate du lien
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_escrow_for_order(
  p_link_id TEXT,
  p_actor_type TEXT DEFAULT 'client'
)
RETURNS JSON AS $$
DECLARE
  pl RECORD;
  v_rate NUMERIC;
  v_commission NUMERIC;
  v_net NUMERIC;
BEGIN
  SELECT * INTO pl FROM public.payment_links WHERE link_id = p_link_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

  IF pl.escrow_released = true THEN
    RETURN json_build_object('success', false, 'error', 'Escrow déjà libéré');
  END IF;

  IF pl.order_status NOT IN ('completed', 'validated') THEN
    RETURN json_build_object('success', false, 'error', 'La commande doit être terminée par le prestataire');
  END IF;

  -- Snapshot lien prioritaire (liens pré-migrate figés à 15 %)
  v_rate := COALESCE(pl.commission_rate, public.get_provider_commission_rate(pl.provider_id));
  v_commission := ROUND(COALESCE(pl.amount, 0) * v_rate / 100.0, 2);
  v_net := COALESCE(pl.amount, 0) - v_commission;

  UPDATE public.payment_links SET
    order_status = 'validated',
    status = 'validated',
    validated_at = NOW(),
    escrow_released = true,
    escrow_released_at = NOW(),
    commission_rate = v_rate,
    commission_amount = v_commission,
    net_amount = v_net,
    auto_validated = (p_actor_type = 'system')
  WHERE link_id = p_link_id;

  INSERT INTO public.order_timeline (payment_link_id, status, action, description, actor_type)
  VALUES (
    pl.id,
    'validated',
    CASE WHEN p_actor_type = 'system' THEN 'Validation automatique' ELSE 'Validation client' END,
    CASE WHEN p_actor_type = 'system'
      THEN 'Fonds libérés automatiquement après délai de grâce (commission ' || v_rate || '%)'
      ELSE 'Le client a validé la livraison (commission ' || v_rate || '%)'
    END,
    p_actor_type
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Paiement libéré au prestataire',
    'commission_rate', v_rate,
    'commission_amount', v_commission,
    'net_amount', v_net
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
