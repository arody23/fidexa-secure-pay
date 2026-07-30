-- SQL Admin Dashboard for KYC Verification

-- 1. View: All pending KYC documents with user info
CREATE OR REPLACE VIEW public.pending_kyc_documents_detailed AS
SELECT
  kd.id,
  kd.user_id,
  u.email,
  u.full_name,
  u.phone_number,
  u.country,
  COUNT(*) FILTER (WHERE kd.verification_status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE kd.verification_status = 'verified') as verified_count,
  COUNT(*) FILTER (WHERE kd.verification_status = 'rejected') as rejected_count,
  MAX(kd.created_at) as last_upload,
  u.kyc_status as current_user_status
FROM public.kyc_documents kd
LEFT JOIN auth.users u ON kd.user_id = u.id
GROUP BY kd.user_id, u.id, u.email, u.full_name, u.phone_number, u.country, u.kyc_status
HAVING COUNT(*) FILTER (WHERE kd.verification_status = 'pending') > 0
ORDER BY MAX(kd.created_at) DESC;

-- 2. Function: Get KYC documents for specific user (admin only)
CREATE OR REPLACE FUNCTION public.get_user_kyc_documents(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  document_type VARCHAR,
  document_side VARCHAR,
  document_url TEXT,
  upload_timestamp BIGINT,
  verification_status VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT
) AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
  ) THEN
    RAISE EXCEPTION 'Only admins can access KYC documents';
  END IF;

  RETURN QUERY
  SELECT
    kd.id,
    kd.document_type,
    kd.document_side,
    kd.document_url,
    kd.upload_timestamp,
    kd.verification_status,
    kd.created_at,
    kd.verification_notes
  FROM public.kyc_documents kd
  WHERE kd.user_id = user_id_param
  ORDER BY kd.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function: Approve KYC documents for user
CREATE OR REPLACE FUNCTION public.approve_kyc_documents(user_id_param UUID, notes_param TEXT DEFAULT NULL)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
  ) THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Only admins can approve KYC'::TEXT;
    RETURN;
  END IF;

  -- Update all documents for user to verified
  UPDATE public.kyc_documents
  SET
    verification_status = 'verified',
    verified_at = NOW(),
    verified_by = auth.uid(),
    verification_notes = COALESCE(notes_param, 'Approved by admin'),
    updated_at = NOW()
  WHERE user_id = user_id_param AND verification_status = 'pending';

  -- Update user KYC status
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{kyc_verified_at}', to_jsonb(NOW()))
  WHERE id = user_id_param;

  UPDATE public.users
  SET kyc_status = 'verified'
  WHERE id = user_id_param;

  RETURN QUERY SELECT true::BOOLEAN, 'KYC documents approved for user'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function: Reject KYC documents for user
CREATE OR REPLACE FUNCTION public.reject_kyc_documents(user_id_param UUID, notes_param TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
  ) THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Only admins can reject KYC'::TEXT;
    RETURN;
  END IF;

  IF notes_param IS NULL OR notes_param = '' THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Rejection reason is required'::TEXT;
    RETURN;
  END IF;

  -- Update documents to rejected
  UPDATE public.kyc_documents
  SET
    verification_status = 'rejected',
    verified_at = NOW(),
    verified_by = auth.uid(),
    verification_notes = notes_param,
    updated_at = NOW()
  WHERE user_id = user_id_param AND verification_status = 'pending';

  -- Update user KYC status
  UPDATE public.users
  SET kyc_status = 'rejected'
  WHERE id = user_id_param;

  RETURN QUERY SELECT true::BOOLEAN, 'KYC documents rejected for user. User can resubmit.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function: Get KYC statistics for admin
CREATE OR REPLACE FUNCTION public.get_kyc_statistics()
RETURNS TABLE (
  total_users BIGINT,
  verified_users BIGINT,
  pending_users BIGINT,
  rejected_users BIGINT,
  total_documents BIGINT,
  verified_documents BIGINT,
  pending_documents BIGINT,
  rejection_rate NUMERIC
) AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
  ) THEN
    RAISE EXCEPTION 'Only admins can access KYC statistics';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(DISTINCT u.id)::BIGINT as total_users,
    COUNT(DISTINCT u.id) FILTER (WHERE u.kyc_status = 'verified')::BIGINT as verified_users,
    COUNT(DISTINCT u.id) FILTER (WHERE u.kyc_status = 'pending')::BIGINT as pending_users,
    COUNT(DISTINCT u.id) FILTER (WHERE u.kyc_status = 'rejected')::BIGINT as rejected_users,
    COUNT(kd.id)::BIGINT as total_documents,
    COUNT(kd.id) FILTER (WHERE kd.verification_status = 'verified')::BIGINT as verified_documents,
    COUNT(kd.id) FILTER (WHERE kd.verification_status = 'pending')::BIGINT as pending_documents,
    ROUND(
      COUNT(kd.id) FILTER (WHERE kd.verification_status = 'rejected')::NUMERIC / 
      NULLIF(COUNT(kd.id), 0) * 100, 2
    ) as rejection_rate
  FROM public.users u
  LEFT JOIN public.kyc_documents kd ON u.id = kd.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS Policy for kyc_documents to allow admins to view all
CREATE POLICY "Admins can view all KYC documents"
  ON public.kyc_documents
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
    )
  );

-- 7. Create index on verification_status for faster admin queries
CREATE INDEX IF NOT EXISTS idx_kyc_documents_verification_status 
ON public.kyc_documents(verification_status, created_at DESC);

-- 8. Table for audit log of KYC verifications
CREATE TABLE IF NOT EXISTS public.kyc_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('approved', 'rejected', 'resubmitted')),
  admin_id UUID REFERENCES auth.users(id),
  notes TEXT,
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on audit log
CREATE INDEX IF NOT EXISTS idx_kyc_audit_log_user_id ON public.kyc_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_log_created_at ON public.kyc_audit_log(created_at DESC);

-- Function to log KYC actions
CREATE OR REPLACE FUNCTION public.log_kyc_action(
  user_id_param UUID,
  action_param VARCHAR,
  notes_param TEXT,
  prev_status_param VARCHAR DEFAULT NULL,
  new_status_param VARCHAR DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.kyc_audit_log (user_id, action, admin_id, notes, previous_status, new_status)
  VALUES (user_id_param, action_param, auth.uid(), notes_param, prev_status_param, new_status_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION public.get_user_kyc_documents(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_kyc_documents(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_kyc_documents(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kyc_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_kyc_action(UUID, VARCHAR, TEXT, VARCHAR, VARCHAR) TO authenticated;

-- RLS for audit log (users can only see their own, admins can see all)
ALTER TABLE public.kyc_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own KYC audit log"
  ON public.kyc_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all KYC audit logs"
  ON public.kyc_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
    )
  );

-- Create admin function to get dashboard summary
CREATE OR REPLACE FUNCTION public.get_kyc_admin_dashboard()
RETURNS TABLE (
  pending_users_count BIGINT,
  pending_documents JSONB,
  statistics JSONB
) AS $$
DECLARE
  v_pending_count BIGINT;
  v_pending_docs JSONB;
  v_stats JSONB;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
  ) THEN
    RAISE EXCEPTION 'Only admins can access KYC dashboard';
  END IF;

  -- Get count
  SELECT COUNT(DISTINCT user_id)
  INTO v_pending_count
  FROM public.kyc_documents
  WHERE verification_status = 'pending';

  -- Get pending documents
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'document_type', document_type,
      'created_at', created_at,
      'document_url', document_url
    )
  )
  INTO v_pending_docs
  FROM public.kyc_documents
  WHERE verification_status = 'pending'
  LIMIT 50;

  -- Get statistics
  SELECT jsonb_build_object(
    'total_verified', COUNT(*) FILTER (WHERE kyc_status = 'verified'),
    'total_pending', COUNT(*) FILTER (WHERE kyc_status = 'pending'),
    'total_rejected', COUNT(*) FILTER (WHERE kyc_status = 'rejected')
  )
  INTO v_stats
  FROM public.users;

  RETURN QUERY SELECT v_pending_count, v_pending_docs, v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_kyc_admin_dashboard() TO authenticated;

-- Add comment to document tables
COMMENT ON TABLE public.kyc_documents IS 'Stores all KYC document uploads with verification status and admin notes';
COMMENT ON TABLE public.kyc_audit_log IS 'Audit trail for all KYC approval/rejection decisions';
COMMENT ON COLUMN public.users.kyc_status IS 'Status of user KYC verification: pending, verified, or rejected';
COMMENT ON COLUMN public.users.kyc_document_url IS 'JSON array of uploaded KYC documents with URLs';
