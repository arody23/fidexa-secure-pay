-- URL gateway + téléphone MoMo pour le checkout abonnement hors PWA
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS checkout_url text;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS momo_phone text;
