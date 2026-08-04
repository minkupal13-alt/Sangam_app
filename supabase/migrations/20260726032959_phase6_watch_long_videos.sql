/*
# Phase 6 — Watch (long-form videos, YouTube-style)

## Overview
Adds the "Watch" feature: long-form videos with categories, search,
like/dislike, comments, subscriptions, and watch history. Extends the
reserved `videos` table from Phase 1 with new columns and creates the
supporting tables, storage bucket, RLS policies, and triggers.

## Modified Tables

### videos (extended)
- New columns: description (text), tags (text[]), visibility (text, default 'public'),
  duration_seconds (int), dislikes_count (int), subscribers-agnostic.
- Existing columns kept: id, user_id, video_url, thumbnail_url, title, category,
  views_count, likes_count, created_at.

## New Tables

1. **video_reactions** — Like or dislike per user per video.
   - id, video_id (FK videos CASCADE), user_id (defaults auth.uid()),
     reaction_type ('like' | 'dislike'), created_at.
   - UNIQUE (video_id, user_id) so one reaction per user per video.

2. **video_comments** — Comments on a video, with nested replies.
   - id, video_id (FK videos CASCADE), user_id (defaults auth.uid()),
     content, parent_comment_id (self-ref CASCADE), likes_count, created_at.

3. **subscriptions** — Channel subscriptions.
   - id, subscriber_id (defaults auth.uid()), channel_id,
     created_at. UNIQUE (subscriber_id, channel_id).

4. **watch_history** — Per-user watch log.
   - id, user_id (defaults auth.uid()), video_id (FK videos CASCADE),
     watched_at, watch_duration (int seconds). UNIQUE (user_id, video_id)
     so we upsert (update watched_at) on re-watch.

## New Storage Bucket
- **watch-videos** — public bucket for long-form video files + thumbnails.
  Read: anon + authenticated. Insert: authenticated. Update/delete: owner.

## Security (RLS)
- videos: public read (only public+unlisted visible to authenticated; private
  only to owner). Owner insert/update/delete.
- video_reactions: public read; owner insert/delete; no update (toggle = delete+insert).
- video_comments: public read; owner insert/delete; owner update (own content).
- subscriptions: public read (so subscriber counts work); owner insert/delete.
- watch_history: owner-only read + upsert + delete (private to each user).

## Triggers
- videos.likes_count / dislikes_count maintained by trigger on video_reactions.
- videos.comments_count maintained by trigger on video_comments (insert/delete).
- profiles.subscribers_count maintained by trigger on subscriptions (insert/delete).
  (Adds a subscribers_count column to profiles if missing.)

## Notes
- Owner columns default to auth.uid() so client inserts omitting user_id succeed.
- Counter triggers use GREATEST(count - 1, 0) to avoid negative counts.
- watch_history upserts via ON CONFLICT (user_id, video_id) DO UPDATE.
*/

-- ============================================================================
-- EXTEND videos TABLE
-- ============================================================================
ALTER TABLE videos ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS dislikes_count integer NOT NULL DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;

-- Allow visibility-based read filtering via a SECURITY DEFINER view later if needed.
-- For now, the RLS policy handles it directly.

-- Re-do videos policies to account for visibility
DROP POLICY IF EXISTS "videos_select" ON videos;
CREATE POLICY "videos_select" ON videos FOR SELECT
  TO authenticated USING (
    visibility = 'public'
    OR visibility = 'unlisted'
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "videos_insert_own" ON videos;
CREATE POLICY "videos_insert_own" ON videos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "videos_update_own" ON videos;
CREATE POLICY "videos_update_own" ON videos FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "videos_delete_own" ON videos;
CREATE POLICY "videos_delete_own" ON videos FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_videos_category ON videos (category);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos (user_id);

-- ============================================================================
-- VIDEO REACTIONS (like / dislike)
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, user_id)
);

ALTER TABLE video_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_reactions_select" ON video_reactions;
CREATE POLICY "video_reactions_select" ON video_reactions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "video_reactions_insert_own" ON video_reactions;
CREATE POLICY "video_reactions_insert_own" ON video_reactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "video_reactions_delete_own" ON video_reactions;
CREATE POLICY "video_reactions_delete_own" ON video_reactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_video_reactions_video ON video_reactions (video_id);

-- ============================================================================
-- VIDEO COMMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES video_comments(id) ON DELETE CASCADE,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_comments_select" ON video_comments;
CREATE POLICY "video_comments_select" ON video_comments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "video_comments_insert_own" ON video_comments;
CREATE POLICY "video_comments_insert_own" ON video_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "video_comments_update_own" ON video_comments;
CREATE POLICY "video_comments_update_own" ON video_comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "video_comments_delete_own" ON video_comments;
CREATE POLICY "video_comments_delete_own" ON video_comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_video_comments_video ON video_comments (video_id);

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscriber_id, channel_id),
  CHECK (subscriber_id <> channel_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select" ON subscriptions;
CREATE POLICY "subscriptions_select" ON subscriptions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "subscriptions_insert_own" ON subscriptions;
CREATE POLICY "subscriptions_insert_own" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = subscriber_id);

DROP POLICY IF EXISTS "subscriptions_delete_own" ON subscriptions;
CREATE POLICY "subscriptions_delete_own" ON subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = subscriber_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_channel ON subscriptions (channel_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions (subscriber_id);

-- ============================================================================
-- WATCH HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watched_at timestamptz NOT NULL DEFAULT now(),
  watch_duration integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, video_id)
);

ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "watch_history_select_own" ON watch_history;
CREATE POLICY "watch_history_select_own" ON watch_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "watch_history_insert_own" ON watch_history;
CREATE POLICY "watch_history_insert_own" ON watch_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "watch_history_update_own" ON watch_history;
CREATE POLICY "watch_history_update_own" ON watch_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "watch_history_delete_own" ON watch_history;
CREATE POLICY "watch_history_delete_own" ON watch_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history (user_id, watched_at DESC);

-- ============================================================================
-- STORAGE BUCKET: watch-videos
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('watch-videos', 'watch-videos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "watch_videos_read" ON storage.objects;
CREATE POLICY "watch_videos_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'watch-videos');

DROP POLICY IF EXISTS "watch_videos_insert" ON storage.objects;
CREATE POLICY "watch_videos_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'watch-videos');

DROP POLICY IF EXISTS "watch_videos_update_own" ON storage.objects;
CREATE POLICY "watch_videos_update_own" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'watch-videos' AND owner = auth.uid()) WITH CHECK (bucket_id = 'watch-videos');

DROP POLICY IF EXISTS "watch_videos_delete_own" ON storage.objects;
CREATE POLICY "watch_videos_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'watch-videos' AND owner = auth.uid());

-- ============================================================================
-- ADD subscribers_count TO profiles
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscribers_count integer NOT NULL DEFAULT 0;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Maintain videos.likes_count and videos.dislikes_count
CREATE OR REPLACE FUNCTION public.update_video_reaction_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.reaction_type = 'like' THEN
      UPDATE public.videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
    ELSIF NEW.reaction_type = 'dislike' THEN
      UPDATE public.videos SET dislikes_count = dislikes_count + 1 WHERE id = NEW.video_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.reaction_type = 'like' THEN
      UPDATE public.videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.video_id;
    ELSIF OLD.reaction_type = 'dislike' THEN
      UPDATE public.videos SET dislikes_count = GREATEST(dislikes_count - 1, 0) WHERE id = OLD.video_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.reaction_type <> NEW.reaction_type THEN
      IF OLD.reaction_type = 'like' THEN
        UPDATE public.videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = NEW.video_id;
        UPDATE public.videos SET dislikes_count = dislikes_count + 1 WHERE id = NEW.video_id;
      ELSE
        UPDATE public.videos SET dislikes_count = GREATEST(dislikes_count - 1, 0) WHERE id = NEW.video_id;
        UPDATE public.videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_video_reactions_count ON video_reactions;
CREATE TRIGGER trg_video_reactions_count
  AFTER INSERT OR DELETE OR UPDATE ON video_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_video_reaction_counts();

-- Maintain videos.comments_count
CREATE OR REPLACE FUNCTION public.update_video_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET comments_count = comments_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_video_comments_count ON video_comments;
CREATE TRIGGER trg_video_comments_count
  AFTER INSERT OR DELETE ON video_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_video_comments_count();

-- Maintain profiles.subscribers_count
CREATE OR REPLACE FUNCTION public.update_subscribers_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET subscribers_count = subscribers_count + 1 WHERE id = NEW.channel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET subscribers_count = GREATEST(subscribers_count - 1, 0) WHERE id = OLD.channel_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_count ON subscriptions;
CREATE TRIGGER trg_subscriptions_count
  AFTER INSERT OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_subscribers_count();

-- Maintain video_comments.likes_count via the polymorphic likes table
-- (target_type = 'video_comment')
CREATE OR REPLACE FUNCTION public.update_video_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'video_comment' THEN
      UPDATE public.video_comments SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'video_comment' THEN
      UPDATE public.video_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.target_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_likes_video_comment_count ON likes;
CREATE TRIGGER trg_likes_video_comment_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION public.update_video_comment_likes_count();
