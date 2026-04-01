-- ============================================
-- CREATE MEDIA STORAGE BUCKET WITH RLS POLICIES
-- Run this in Supabase SQL Editor
-- ============================================

-- Create the media bucket for storing images (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm'];

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Public read access for media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete media" ON storage.objects;
DROP POLICY IF EXISTS "Allow all access to media bucket" ON storage.objects;
DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
DROP POLICY IF EXISTS "media_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "media_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "media_auth_delete" ON storage.objects;

-- Allow PUBLIC read access (anyone can view uploaded images)
CREATE POLICY "media_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Allow authenticated users to upload to media bucket
CREATE POLICY "media_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow authenticated users to update files in media bucket
CREATE POLICY "media_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');

-- Allow authenticated users to delete files from media bucket
CREATE POLICY "media_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');
