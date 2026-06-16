-- 003b_storage_bucket.sql
-- Create the 'papers' storage bucket and RLS policies for user-scoped PDF access.
-- Files are stored at: papers/{user_id}/{paper_id}.pdf
-- Run this in the Supabase SQL Editor after 003_rag_extensions.sql.

-- 1. Create the 'papers' storage bucket (private, not publicly accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('papers', 'papers', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies: users can only access files under their own {user_id}/ prefix

-- Users can upload their own PDFs
CREATE POLICY "Users can upload PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'papers' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own PDFs
CREATE POLICY "Users can read own PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'papers' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own PDFs
CREATE POLICY "Users can delete own PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'papers' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
