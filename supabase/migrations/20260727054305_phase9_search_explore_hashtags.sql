/*
# Phase 9 — Search, Explore & Hashtags

## Overview
Adds search analytics, hashtag following, and trending-score computation.
Also adds a `tags` array column to `posts` and `flicks` so hashtags can be
attached to all content types (videos already have `tags`).

## Changes to existing tables
- `posts`: ADD COLUMN `tags text[] DEFAULT '{}'`
- `flicks`: ADD COLUMN `tags text[] DEFAULT '{}'`

## New Tables
1. **search_history** — recent search queries per user.
2. **hashtag_follows** — which hashtags a user follows.

## Functions
- `hashtag_trending_score(h_id uuid)` → integer:
  (posts in last 24h * 3) + (posts in last 7 days), across posts/flicks/videos.
- `trending_hashtags(lim integer)` → table: top hashtags by trending score.

## RLS
- search_history: owner can SELECT/INSERT/DELETE own rows.
- hashtag_follows: anyone can SELECT; owner can INSERT/DELETE own rows.
*/

-- ============================================================================
-- ADD tags COLUMN TO posts AND flicks
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN tags text[] DEFAULT '{}' NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flicks' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.flicks ADD COLUMN tags text[] DEFAULT '{}' NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_flicks_tags ON flicks USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_videos_tags ON videos USING GIN (tags);

-- ============================================================================
-- search_history TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  query text NOT NULL,
  searched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sh_select_own" ON search_history;
CREATE POLICY "sh_select_own" ON search_history FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "sh_insert_own" ON search_history;
CREATE POLICY "sh_insert_own" ON search_history FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "sh_delete_own" ON search_history;
CREATE POLICY "sh_delete_own" ON search_history FOR DELETE
  TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_sh_user ON search_history (user_id, searched_at DESC);

-- ============================================================================
-- hashtag_follows TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hashtag_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, hashtag_id)
);

ALTER TABLE hashtag_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hf_select_all" ON hashtag_follows;
CREATE POLICY "hf_select_all" ON hashtag_follows FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "hf_insert_own" ON hashtag_follows;
CREATE POLICY "hf_insert_own" ON hashtag_follows FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "hf_delete_own" ON hashtag_follows;
CREATE POLICY "hf_delete_own" ON hashtag_follows FOR DELETE
  TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_hf_hashtag ON hashtag_follows (hashtag_id);
CREATE INDEX IF NOT EXISTS idx_hf_user ON hashtag_follows (user_id);

-- ============================================================================
-- TRENDING SCORE FUNCTION (LANGUAGE plpgsql for variable support)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.hashtag_trending_score(h_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  tag_name text;
  score integer := 0;
BEGIN
  SELECT tag_name INTO tag_name FROM public.hashtags WHERE id = h_id;
  IF tag_name IS NULL THEN
    RETURN 0;
  END IF;

  SELECT
    (
      (SELECT count(*) FROM public.posts WHERE tags @> ARRAY[lower(tag_name)] AND created_at > now() - interval '24 hours') * 3
      + (SELECT count(*) FROM public.posts WHERE tags @> ARRAY[lower(tag_name)] AND created_at > now() - interval '7 days')
      + (SELECT count(*) FROM public.flicks WHERE tags @> ARRAY[lower(tag_name)] AND created_at > now() - interval '24 hours') * 3
      + (SELECT count(*) FROM public.flicks WHERE tags @> ARRAY[lower(tag_name)] AND created_at > now() - interval '7 days')
      + (SELECT count(*) FROM public.videos WHERE tags @> ARRAY[lower(tag_name)] AND created_at > now() - interval '24 hours') * 3
      + (SELECT count(*) FROM public.videos WHERE tags @> ARRAY[lower(tag_name)] AND created_at > now() - interval '7 days')
    )
  INTO score;

  RETURN score;
END;
$$;

-- ============================================================================
-- TRENDING HASHTAGS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trending_hashtags(lim integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  tag_name text,
  posts_count integer,
  trending_score integer,
  category text
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.tag_name,
    h.posts_count,
    COALESCE(public.hashtag_trending_score(h.id), 0) as trending_score,
    COALESCE(
      CASE
        WHEN h.tag_name ~* 'music|song|singer|rap|beat' THEN 'Music'
        WHEN h.tag_name ~* 'sport|cricket|football|kabaddi|game' THEN 'Sports'
        WHEN h.tag_name ~* 'news|politics|election|govt' THEN 'News'
        WHEN h.tag_name ~* 'food|recipe|cooking|chef' THEN 'Food'
        WHEN h.tag_name ~* 'travel|wander|trip|tour' THEN 'Travel'
        WHEN h.tag_name ~* 'fashion|style|outfit|look' THEN 'Fashion'
        WHEN h.tag_name ~* 'tech|code|app|gadget' THEN 'Tech'
        WHEN h.tag_name ~* 'art|paint|draw|design' THEN 'Art'
        ELSE 'Trending'
      END, 'Trending'
    ) as category
  FROM public.hashtags h
  WHERE h.posts_count > 0
  ORDER BY COALESCE(public.hashtag_trending_score(h.id), 0) DESC NULLS LAST
  LIMIT lim;
END;
$$;
