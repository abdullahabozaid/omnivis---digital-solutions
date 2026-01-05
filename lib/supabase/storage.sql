-- Storage Buckets Configuration for Supabase
-- Run this in the Supabase SQL Editor AFTER creating the tables

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('brand-assets', 'brand-assets', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp']),
  ('snapshots', 'snapshots', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']),
  ('websites', 'websites', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Brand Assets Bucket Policies
CREATE POLICY "Public read access for brand-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated users can upload to brand-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated users can update brand-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated users can delete from brand-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'brand-assets');

-- Snapshots Bucket Policies
CREATE POLICY "Public read access for snapshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'snapshots');

CREATE POLICY "Authenticated users can upload to snapshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'snapshots');

CREATE POLICY "Authenticated users can update snapshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'snapshots');

CREATE POLICY "Authenticated users can delete from snapshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'snapshots');

-- Websites Bucket Policies
CREATE POLICY "Public read access for websites"
ON storage.objects FOR SELECT
USING (bucket_id = 'websites');

CREATE POLICY "Authenticated users can upload to websites"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'websites');

CREATE POLICY "Authenticated users can update websites"
ON storage.objects FOR UPDATE
USING (bucket_id = 'websites');

CREATE POLICY "Authenticated users can delete from websites"
ON storage.objects FOR DELETE
USING (bucket_id = 'websites');
