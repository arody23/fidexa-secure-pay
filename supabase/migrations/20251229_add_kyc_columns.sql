-- Add KYC columns to users table if they don't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT NULL CHECK (kyc_status IN ('pending', 'verified', 'rejected') OR kyc_status IS NULL),
ADD COLUMN IF NOT EXISTS kyc_document_url JSONB DEFAULT NULL;

-- Create table for audit logging of KYC submissions
CREATE TABLE IF NOT EXISTS public.kyc_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on kyc_audit_log
ALTER TABLE public.kyc_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only view their own KYC audit logs
CREATE POLICY "Users can view their own KYC audit logs"
ON public.kyc_audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- RLS policy: Only system/admin can insert into audit log
CREATE POLICY "Only system can insert KYC audit logs"
ON public.kyc_audit_log
FOR INSERT
WITH CHECK (auth.uid()::text = 'system' OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
));

-- Create function to log KYC status changes
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

-- Create trigger for KYC status changes
DROP TRIGGER IF EXISTS log_kyc_status_change_trigger ON public.users;
CREATE TRIGGER log_kyc_status_change_trigger
AFTER UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.log_kyc_status_change();

-- Create function for admin to get all KYC submissions
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_kyc_submissions() TO authenticated;
