/*
# Phase 4 — Stories: storage bucket + story_views table

## Overview
Creates a dedicated `stories` storage bucket for story media uploads and a
new `story_views` table to track who has viewed each story. The existing
`stories` table (created in phase 1) already stores story rows with
`expires_at = now + 24 hours`.

## New Storage Bucket
- **stories** — public bucket for story photos and videos.
  - Public read, authenticated upload, owner-only update/delete.

## New Table: story_views
- id (uuid, PK)
- story_id (uuid, FK to stories, ON DELETE CASCADE)
- viewer_id (uuid, FK to profiles, ON DELETE CASCADE)
- viewed_at (timestamptz, default now())
- UNIQUE(story_id, viewer_id) — one view per user per story.

## Security (RLS)
- story_views: viewers can insert their own view rows; story owners can
  read views on their own stories; everyone else cannot read.
- stories table policies already exist from phase 1 (public read, owner
  insert/delete). No changes needed there.

## Notes
- Expired stories are filtered at query time (`expires_at > now()`).
  The `expires_at` default of `now() + 24 hours` was set in phase 1.
*/

-- stories storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "stories_bucket_read" ON storage.objects;
CREATE POLICY "stories_bucket_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'stories');

DROP POLICY IF EXISTS "stories_bucket_insert" ON storage.objects;
CREATE POLICY "stories_bucket_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'stories');

DROP POLICY IF EXISTS "stories_bucket_update_own" ON storage.objects;
CREATE POLICY "stories_bucket_update_own" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'stories' AND owner = auth.uid()) WITH CHECK (bucket_id = 'stories');

DROP POLICY IF EXISTS "stories_bucket_delete_own" ON storage.objects;
CREATE POLICY "stories_bucket_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'stories' AND owner = auth.uid());

-- story_views table
CREATE TABLE IF NOT EXISTS story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- Viewers can insert their own view records
DROP POLICY IF EXISTS "story_views_insert_own" ON story_views;
CREATE POLICY "story_views_insert_own" ON story_views FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = viewer_id);

-- Story owners can read views on their own stories (to show viewer list)
DROP POLICY IF EXISTS "story_views_select_owner" ON story_views;
CREATE POLICY "story_views_select_owner" ON story_views FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_views.story_id
      AND stories.user_id = auth.uid()
    )
  );

-- Viewers can read their own view records (to check seen status)
DROP POLICY IF EXISTS "story_views_select_own" ON story_views;
CREATE POLICY "story_views_select_own" ON story_views FOR SELECT
  TO authenticated USING (auth.uid() = viewer_id);

CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views (story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON story_views (viewer_id);
