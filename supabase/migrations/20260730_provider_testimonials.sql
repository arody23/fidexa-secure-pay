-- Avis / témoignages prestataires (modération admin)
CREATE TABLE IF NOT EXISTS public.provider_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(trim(content)) >= 20 AND char_length(content) <= 800),
  rating integer NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_testimonials_status ON public.provider_testimonials(status);
CREATE INDEX IF NOT EXISTS idx_provider_testimonials_user ON public.provider_testimonials(user_id);

ALTER TABLE public.provider_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "testimonials_select_approved_or_own" ON public.provider_testimonials;
CREATE POLICY "testimonials_select_approved_or_own"
  ON public.provider_testimonials FOR SELECT
  USING (
    status = 'approved'
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (u.is_admin = true OR u.role = 'admin')
    )
  );

DROP POLICY IF EXISTS "testimonials_insert_own" ON public.provider_testimonials;
CREATE POLICY "testimonials_insert_own"
  ON public.provider_testimonials FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "testimonials_update_own_pending" ON public.provider_testimonials;
CREATE POLICY "testimonials_update_own_pending"
  ON public.provider_testimonials FOR UPDATE
  USING (
    (auth.uid() = user_id AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (u.is_admin = true OR u.role = 'admin')
    )
  );

DROP POLICY IF EXISTS "testimonials_admin_delete" ON public.provider_testimonials;
CREATE POLICY "testimonials_admin_delete"
  ON public.provider_testimonials FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (u.is_admin = true OR u.role = 'admin')
    )
  );

-- Profils publics pour la landing (champs non sensibles)
CREATE OR REPLACE FUNCTION public.get_landing_providers()
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  country text,
  bio text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.full_name,
    u.avatar_url,
    u.country,
    u.bio
  FROM public.users u
  WHERE COALESCE(u.is_admin, false) = false
    AND COALESCE(u.role, '') IS DISTINCT FROM 'admin'
    AND u.full_name IS NOT NULL
    AND length(trim(u.full_name)) > 0
  ORDER BY u.created_at DESC
  LIMIT 24;
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_providers() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_approved_testimonials()
RETURNS TABLE (
  id uuid,
  content text,
  rating integer,
  full_name text,
  avatar_url text,
  country text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.content,
    t.rating,
    u.full_name,
    u.avatar_url,
    u.country,
    t.created_at
  FROM public.provider_testimonials t
  JOIN public.users u ON u.id = t.user_id
  WHERE t.status = 'approved'
  ORDER BY t.reviewed_at DESC NULLS LAST, t.created_at DESC
  LIMIT 40;
$$;

GRANT EXECUTE ON FUNCTION public.get_approved_testimonials() TO anon, authenticated;
