-- Migration pour ajouter les colonnes MoneyFusion
-- Date: 2025-12-30

-- Ajouter les colonnes pour stocker les IDs MoneyFusion dans payment_links
ALTER TABLE public.payment_links
ADD COLUMN IF NOT EXISTS moneyfusion_payment_id TEXT,
ADD COLUMN IF NOT EXISTS moneyfusion_escrow_id TEXT,
ADD COLUMN IF NOT EXISTS payment_url TEXT,
ADD COLUMN IF NOT EXISTS moneyfusion_status TEXT;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_payment_links_moneyfusion_payment_id 
ON public.payment_links(moneyfusion_payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_links_moneyfusion_escrow_id 
ON public.payment_links(moneyfusion_escrow_id);

-- Ajouter des commentaires
COMMENT ON COLUMN public.payment_links.moneyfusion_payment_id IS 'ID du paiement dans MoneyFusion';
COMMENT ON COLUMN public.payment_links.moneyfusion_escrow_id IS 'ID de l''escrow dans MoneyFusion';
COMMENT ON COLUMN public.payment_links.payment_url IS 'URL de paiement MoneyFusion';
COMMENT ON COLUMN public.payment_links.moneyfusion_status IS 'Statut du paiement MoneyFusion';
