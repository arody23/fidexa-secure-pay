-- Migration: Create KYC Documents Table and Update Users Table
-- Date: 2024-12-29

-- 1. Add KYC-related columns to users table (if not already present)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS kyc_document_url JSONB DEFAULT NULL;

-- 2. Create KYC Documents Table
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('selfie', 'cni', 'passport', 'permis', 'electoral_card')),
  document_side VARCHAR(20) NOT NULL CHECK (document_side IN ('recto', 'verso', 'single')),
  document_url TEXT NOT NULL,
  upload_timestamp BIGINT NOT NULL,
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_notes TEXT DEFAULT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON public.kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON public.kyc_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_type ON public.kyc_documents(document_type);

-- 3. RLS Policies for kyc_documents table

-- Enable RLS
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Users can view their own KYC documents
CREATE POLICY IF NOT EXISTS "Users can view own KYC documents"
  ON public.kyc_documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own KYC documents
CREATE POLICY IF NOT EXISTS "Users can insert own KYC documents"
  ON public.kyc_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all KYC documents
CREATE POLICY IF NOT EXISTS "Admins can view all KYC documents"
  ON public.kyc_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
    )
  );

-- Admins can update KYC documents (for verification)
CREATE POLICY IF NOT EXISTS "Admins can update KYC verification"
  ON public.kyc_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
    )
  );

-- 4. Update existing users RLS to include KYC columns
-- Users can update their own KYC status
ALTER POLICY IF EXISTS "Users can update own profile" ON public.users
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Create trigger to update kyc_documents.updated_at
CREATE OR REPLACE FUNCTION update_kyc_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_kyc_documents_updated_at_trigger ON public.kyc_documents;
CREATE TRIGGER update_kyc_documents_updated_at_trigger
BEFORE UPDATE ON public.kyc_documents
FOR EACH ROW
EXECUTE FUNCTION update_kyc_documents_updated_at();

-- 6. Create view for admin dashboard to see pending KYC documents
CREATE OR REPLACE VIEW public.pending_kyc_documents AS
SELECT
  kd.id,
  kd.user_id,
  u.email,
  u.full_name,
  u.phone_number,
  u.country,
  kd.document_type,
  kd.document_side,
  kd.document_url,
  kd.created_at,
  kd.verification_status,
  kd.verification_notes
FROM public.kyc_documents kd
LEFT JOIN auth.users u ON kd.user_id = u.id
WHERE kd.verification_status = 'pending'
ORDER BY kd.created_at ASC;

-- 7. Bucket KYC Documents (Storage) - Created manually in Supabase Console
-- Bucket name: kyc-documents
-- Bucket path policy: users can only access their own folder (auth.uid())

-- MANUAL STEPS IN SUPABASE CONSOLE:
-- 1. Create bucket: "kyc-documents"
-- 2. Set policies:
--    - CREATE: users can create in their own folder: auth.uid() = (storage.foldername).split('/')[0]
--    - READ: users can read their own files: auth.uid() = (storage.foldername).split('/')[0]
--    - UPDATE: users can update their own files: auth.uid() = (storage.foldername).split('/')[0]
--    - DELETE: users can delete their own files: auth.uid() = (storage.foldername).split('/')[0]
--    - Admins can read all: (select is_admin from auth.users where id = auth.uid())

-- Expected bucket structure:
-- kyc-documents/
--   └── {user-id}/
--       ├── cni/
--       │   ├── recto_1735500000.jpg
--       │   └── verso_1735500001.jpg
--       ├── passport/
--       │   └── single_1735500002.jpg
--       └── selfie/
--           └── single_1735500003.jpg

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON public.users(kyc_status);
