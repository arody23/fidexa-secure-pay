-- Fix RLS admin : role=admin peut voir tous les retraits

DROP POLICY IF EXISTS "withdrawals_select_own" ON public.withdrawals;

CREATE POLICY "withdrawals_select_own"
  ON public.withdrawals FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (COALESCE(u.is_admin, false) OR u.role = 'admin')
    )
  );

NOTIFY pgrst, 'reload schema';
