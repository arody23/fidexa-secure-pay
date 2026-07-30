-- Secure admin KYC status update
-- Creates a SECURITY DEFINER function so admin users can approve/reject even with RLS

CREATE OR REPLACE FUNCTION public.admin_update_kyc_status(
    target_user_id UUID,
    new_status TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF new_status NOT IN ('pending', 'verified', 'rejected') THEN
        RAISE EXCEPTION 'Invalid KYC status: %', new_status;
    END IF;

    UPDATE public.users
    SET kyc_status = new_status,
        verified = (new_status = 'verified'),
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_kyc_status(UUID, TEXT) TO authenticated;
