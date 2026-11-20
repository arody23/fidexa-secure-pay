-- Autoriser les statuts du nouveau cycle d’abonnement (pending / paid / failed)
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (
    status IS NULL
    OR status = ANY (
      ARRAY[
        'pending'::text,
        'paid'::text,
        'failed'::text,
        'expired'::text,
        'active'::text,
        'cancelled'::text
      ]
    )
  );
