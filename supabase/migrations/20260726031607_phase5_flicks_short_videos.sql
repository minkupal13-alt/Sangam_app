/*
# Phase 5 — Flicks (short vertical videos)

## Overview
Adds a full "Flicks" feature — short vertical videos like TikTok/Reels —
distinct from the reserved `reels` table. Includes flicks, flick comments,
view tracking, a dedicated storage bucket, and all RLS policies + triggers.

## New Tables

1. **flicks** — Short vertical videos.
   - id (uuid PK), user_id (defaults to auth.uid(), FK profiles),
     video_url (text), thumbnail_url (text), caption (text),
     audio_name (text, optional — music/audio label),
     likes_count (int), comments_count (int), views_count (int),
     created_at.

2. **flick_comments** — Comments on a flick, with nested replies.
   - id (uuid PK), flick_id (FK flicks CASCADE), user_id (defaults auth.uid()),
     content (text), parent_comment_id (self-ref CASCADE),
     likes_count (int), created_at.

3. **flick_views** — Dedup record of views per user per flick.
   - id (uuid PK), flick_id (FK flicks CASCADE), user_id (defaults auth.uid()),
     created_at. UNIQUE (flick_id, user_id) so one user = one view per flick.

## New Storage Bucket
- **flicks-media** — public bucket for flick video files and thumbnails.
  - Read: anon + authenticated. Insert: authenticated. Update/delete: owner.

## Security (RLS)
- flicks: public read (TO authenticated); owner insert/update/delete.
- flick_comments: public read; owner insert/delete; owner update (own content).
- flick_views: owner insert only (a user records their own view); owner read.
  No delete — views are immutable.
- Reuses the polymorphic `likes` table with target_type = 'flick' and
  target_id = flick id. A trigger keeps flicks.likes_count in sync for
  likes where target_type = 'flick'.

## Triggers
- flicks.likes_count maintained by a new trigger on `likes` for target_type='flick'.
- flicks.comments_count maintained by a trigger on flick_comments (insert/delete).
- flicks.views_count maintained by a trigger on flick_views (insert only).

## Notes
- Owner columns default to auth.uid() so client inserts omitting user_id succeed.
- All counter triggers use GREATEST(count - 1, 0) to avoid negative counts.
*/

-- ============================================================================
-- FLICKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS flicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  thumbnail_url text,
  caption text NOT NULL DEFAULT '',
  audio_name text,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE flicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flicks_select" ON flicks;
CREATE POLICY "flicks_select" ON flicks FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "flicks_insert_own" ON flicks;
CREATE POLICY "flicks_insert_own" ON flicks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "flicks_update_own" ON flicks;
CREATE POLICY "flicks_update_own" ON flicks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "flicks_delete_own" ON flicks;
CREATE POLICY "flicks_delete_own" ON flicks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_flicks_created_at ON flicks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flicks_user_id ON flicks (user_id);

-- ============================================================================
-- FLICK COMMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS flick_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flick_id uuid NOT NULL REFERENCES flicks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES flick_comments(id) ON DELETE CASCADE,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE flick_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flick_comments_select" ON flick_comments;
CREATE POLICY "flick_comments_select" ON flick_comments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "flick_comments_insert_own" ON flick_comments;
CREATE POLICY "flick_comments_insert_own" ON flick_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "flick_comments_update_own" ON flick_comments;
CREATE POLICY "flick_comments_update_own" ON flick_comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "flick_comments_delete_own" ON flick_comments;
CREATE POLICY "flick_comments_delete_own" ON flick_comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_flick_comments_flick_id ON flick_comments (flick_id);

-- ============================================================================
-- FLICK VIEWS (dedup per user per flick)
-- ============================================================================
CREATE TABLE IF NOT EXISTS flick_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flick_id uuid NOT NULL REFERENCES flicks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flick_id, user_id)
);

ALTER TABLE flick_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flick_views_select_own" ON flick_views;
CREATE POLICY "flick_views_select_own" ON flick_views FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "flick_views_insert_own" ON flick_views;
CREATE POLICY "flick_views_insert_own" ON flick_views FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STORAGE BUCKET: flicks-media
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('flicks-media', 'flicks-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "flicks_media_read" ON storage.objects;
CREATE POLICY "flicks_media_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'flicks-media');

DROP POLICY IF EXISTS "flicks_media_insert" ON storage.objects;
CREATE POLICY "flicks_media_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'flicks-media');

DROP POLICY IF EXISTS "flicks_media_update_own" ON storage.objects;
CREATE POLICY "flicks_media_update_own" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'flicks-media' AND owner = auth.uid()) WITH CHECK (bucket_id = 'flicks-media');

DROP POLICY IF EXISTS "flicks_media_delete_own" ON storage.objects;
CREATE POLICY "flicks_media_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'flicks-media' AND owner = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Maintain flicks.likes_count for likes where target_type = 'flick'
CREATE OR REPLACE FUNCTION public.update_flick_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'flick' THEN
      UPDATE public.flicks SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'flick' THEN
      UPDATE public.flicks SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.target_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_likes_flick_count ON likes;
CREATE TRIGGER trg_likes_flick_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION public.update_flick_likes_count();

-- Maintain flicks.comments_count
CREATE OR REPLACE FUNCTION public.update_flick_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.flicks SET comments_count = comments_count + 1 WHERE id = NEW.flick_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.flicks SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.flick_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_flick_comments_count ON flick_comments;
CREATE TRIGGER trg_flick_comments_count
  AFTER INSERT OR DELETE ON flick_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_flick_comments_count();

-- Maintain flicks.views_count (insert only — views are immutable)
CREATE OR REPLACE FUNCTION public.update_flick_views_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.flicks SET views_count = views_count + 1 WHERE id = NEW.flick_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_flick_views_count ON flick_views;
CREATE TRIGGER trg_flick_views_count
  AFTER INSERT ON flick_views
  FOR EACH ROW EXECUTE FUNCTION public.update_flick_views_count();
