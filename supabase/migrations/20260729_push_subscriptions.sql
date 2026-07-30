-- Abonnements Web Push (VAPID)

CREATE TABLE IF NOT EXISTS public.push_subscriptions (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  endpoint TEXT NOT NULL,

  p256dh TEXT NOT NULL,

  auth TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, endpoint)

);



ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;



CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions

  FOR SELECT USING (auth.uid() = user_id);



CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions

  FOR INSERT WITH CHECK (auth.uid() = user_id);



CREATE POLICY push_subscriptions_update_own ON public.push_subscriptions

  FOR UPDATE USING (auth.uid() = user_id);



CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions

  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
  p_endpoint TEXT,
  p_p256dh TEXT,
  p_auth TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth)
  ON CONFLICT (user_id, endpoint) DO UPDATE
  SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_push_subscription TO authenticated;
