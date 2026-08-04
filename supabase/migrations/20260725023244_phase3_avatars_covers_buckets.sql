/*
# Phase 3 — Dedicated avatars and covers storage buckets

## Overview
Creates two dedicated public storage buckets: `avatars` for profile avatar
images and `covers` for profile cover photos. Previously avatars were uploaded
to the generic `media` bucket; this migration separates them for clarity and
easier lifecycle management.

## New Storage Buckets
1. **avatars** — public bucket for user avatar images.
2. **covers** — public bucket for user cover photos.

## Security
Both buckets get the same RLS policy pattern:
- Everyone (anon + authenticated) can read (avatars/covers are public).
- Authenticated users can upload.
- Owners can update/delete their own files.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- avatars bucket policies
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'avatars' AND owner = auth.uid()) WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'avatars' AND owner = auth.uid());

-- covers bucket policies
DROP POLICY IF EXISTS "covers_read" ON storage.objects;
CREATE POLICY "covers_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'covers');

DROP POLICY IF EXISTS "covers_insert" ON storage.objects;
CREATE POLICY "covers_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'covers');

DROP POLICY IF EXISTS "covers_update_own" ON storage.objects;
CREATE POLICY "covers_update_own" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'covers' AND owner = auth.uid()) WITH CHECK (bucket_id = 'covers');

DROP POLICY IF EXISTS "covers_delete_own" ON storage.objects;
CREATE POLICY "covers_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'covers' AND owner = auth.uid());
