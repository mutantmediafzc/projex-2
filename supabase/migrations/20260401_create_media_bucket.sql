-- ============================================
-- CREATE MEDIA STORAGE BUCKET
-- Run this in Supabase SQL Editor
-- ============================================

-- Create the media bucket for storing images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to media bucket
CREATE POLICY IF NOT EXISTS "Public read access for media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Allow authenticated users to upload to media bucket
CREATE POLICY IF NOT EXISTS "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow authenticated users to update their uploads
CREATE POLICY IF NOT EXISTS "Authenticated users can update media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media');

-- Allow authenticated users to delete media
CREATE POLICY IF NOT EXISTS "Authenticated users can delete media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');

-- Alternative: Allow public access for all operations (simpler but less secure)
-- Uncomment if the above policies don't work
/*
CREATE POLICY "Allow all access to media bucket"
ON storage.objects
FOR ALL
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');
*/
