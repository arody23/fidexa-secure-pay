-- ================================================================================
-- MIGRATION: Add KYC columns to users table and related infrastructure
-- Date: 2025-12-29
-- Description: Ajoute les colonnes kyc_status et kyc_document_url à la table users
--              pour supporter le système de vérification d'identité KYC
-- ================================================================================

-- 1. ADD COLUMNS TO USERS TABLE
-- ================================================================================
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT NULL CHECK (kyc_status IN ('pending', 'verified', 'rejected') OR kyc_status IS NULL),
ADD COLUMN IF NOT EXISTS kyc_document_url JSONB DEFAULT NULL;

-- 2. CREATE KYC AUDIT LOG TABLE (for admin tracking)
-- ================================================================================
CREATE TABLE IF NOT EXISTS public.kyc_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on kyc_audit_log
ALTER TABLE public.kyc_audit_log ENABLE ROW LEVEL SECURITY;

-- 3. UPDATE STORAGE PERMISSIONS
-- ================================================================================
-- The KYC uploads are stored in supabase Storage under 'kyc/{user_id}/' path
-- Ensure the bucket exists and has proper permissions

-- 4. RLS POLICIES
-- ================================================================================

-- Policy: Users can only view their own audit logs
DROP POLICY IF EXISTS "Users can view their own KYC audit logs" ON public.kyc_audit_log;
CREATE POLICY "Users can view their own KYC audit logs"
ON public.kyc_audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: System can insert audit logs
DROP POLICY IF EXISTS "System can insert KYC audit logs" ON public.kyc_audit_log;
CREATE POLICY "System can insert KYC audit logs"
ON public.kyc_audit_log
FOR INSERT
WITH CHECK (true);

-- 5. FUNCTIONS
-- ================================================================================

-- Function to log KYC status changes
DROP FUNCTION IF EXISTS public.log_kyc_status_change() CASCADE;
CREATE OR REPLACE FUNCTION public.log_kyc_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
        INSERT INTO public.kyc_audit_log (user_id, action, details)
        VALUES (
            NEW.id,
            'KYC_STATUS_CHANGED',
            jsonb_build_object(
                'old_status', OLD.kyc_status,
                'new_status', NEW.kyc_status,
                'timestamp', NOW()
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function for admin to get all KYC submissions
DROP FUNCTION IF EXISTS public.get_kyc_submissions() CASCADE;
CREATE OR REPLACE FUNCTION public.get_kyc_submissions()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    kyc_status TEXT,
    kyc_document_url JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.full_name,
        u.kyc_status,
        u.kyc_document_url,
        u.created_at
    FROM public.users u
    WHERE u.kyc_status IS NOT NULL
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_kyc_submissions() TO authenticated;

-- 6. TRIGGERS
-- ================================================================================

-- Trigger to log KYC status changes
DROP TRIGGER IF EXISTS log_kyc_status_change_trigger ON public.users;
CREATE TRIGGER log_kyc_status_change_trigger
AFTER UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.log_kyc_status_change();

-- ================================================================================
-- VERIFICATION QUERIES
-- ================================================================================

-- Check if columns were added successfully
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name='users' AND column_name IN ('kyc_status', 'kyc_document_url');

-- Check the structure
-- SELECT * FROM public.users LIMIT 1;

-- ================================================================================
-- END OF MIGRATION
-- ================================================================================
