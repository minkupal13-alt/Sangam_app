/*
# Phase 2 — Reposts support + post-media storage bucket

## Overview
This migration adds repost support to the posts table and creates a dedicated
"post-media" storage bucket for user-uploaded post images and videos.

## Changes

### 1. posts table — add repost_of column
- New column: `repost_of` (uuid, nullable, self-references posts.id)
- When a user reposts, a new row is inserted with `repost_of` set to the
  original post's id. The repost's `content` holds the user's added caption
  (if any), and `user_id` is the reposter.
- This lets us render reposts with original-author credit by joining
  through `repost_of`.
- Added an index on `repost_of` for efficient lookups.

### 2. Storage bucket: post-media
- New public bucket `post-media` for post images and videos.
- RLS policies: authenticated users can upload/update/delete their own
  files; everyone (anon + authenticated) can read.

## Security
- The existing posts RLS policies already cover insert/update/delete for
  owner-scoped rows, so reposts (which are just regular posts with
  `repost_of` set) inherit the same protection.
- Storage policies follow the same pattern as the existing `media` bucket.
*/

-- Add repost_of column to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS repost_of uuid REFERENCES posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_repost_of ON posts (repost_of);

-- Create post-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post-media bucket
DROP POLICY IF EXISTS "post_media_read" ON storage.objects;
CREATE POLICY "post_media_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "post_media_insert" ON storage.objects;
CREATE POLICY "post_media_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'post-media');

DROP POLICY IF EXISTS "post_media_update_own" ON storage.objects;
CREATE POLICY "post_media_update_own" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'post-media' AND owner = auth.uid()) WITH CHECK (bucket_id = 'post-media');

DROP POLICY IF EXISTS "post_media_delete_own" ON storage.objects;
CREATE POLICY "post_media_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'post-media' AND owner = auth.uid());
