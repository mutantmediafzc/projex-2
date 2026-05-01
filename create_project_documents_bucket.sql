-- =====================================================
-- Supabase Storage Setup for Project Documents
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Create the project-documents bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  true,
  104857600, -- 100MB limit per file
  NULL       -- allow all file types
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated insert project-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select project-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update project-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete project-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public select project-documents" ON storage.objects;

-- 3. INSERT policy — authenticated users can upload
CREATE POLICY "Allow authenticated insert project-documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-documents');

-- 4. SELECT policy — public can read (so files are viewable/downloadable)
CREATE POLICY "Allow public select project-documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'project-documents');

-- 5. UPDATE policy — authenticated users can update (upsert)
CREATE POLICY "Allow authenticated update project-documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'project-documents')
WITH CHECK (bucket_id = 'project-documents');

-- 6. DELETE policy — authenticated users can delete
CREATE POLICY "Allow authenticated delete project-documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'project-documents');
