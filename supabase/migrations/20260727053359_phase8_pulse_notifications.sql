/*
# Phase 8 — Pulse (Notifications System)

## Overview
Extends the existing `notifications` table with `target_type` and `preview_text`
columns, creates a `notification_settings` table for per-user toggle preferences,
adds database triggers to auto-create notifications on likes, comments, follows,
and reposts (echoes), enables realtime on the notifications table, and sets RLS.

## Changes to existing tables
- `notifications`: ADD COLUMN `target_type` text (values: 'post','comment',
  'profile','conversation','flick','video'), ADD COLUMN `preview_text` text.
  Both nullable for backward compatibility with existing rows.

## New Tables
1. **notification_settings** — per-user toggle preferences.
   - id, user_id (uuid, unique, defaults auth.uid()),
   - likes_enabled, comments_enabled, follows_enabled, mentions_enabled,
     messages_enabled, echoes_enabled (all boolean, default true),
   - created_at, updated_at.

## Triggers
- On `likes` INSERT (target_type='post'): create 'like' notification for the
  post owner (if not self-like).
- On `comments` INSERT: create 'comment' notification for the post owner
  (if not self-comment), with preview_text = comment content.
- On `follows` INSERT: create 'follow' notification for the followed user
  (if not self-follow).
- On `posts` INSERT WHERE repost_of IS NOT NULL: create 'echo' notification
  for the original post owner (if not self-repost).

All trigger functions check notification_settings before inserting — if the
recipient has disabled that notification type, no row is inserted.

## Realtime
- `notifications` table added to `supabase_realtime` publication so INSERT
  events are broadcast to clients.

## RLS
- notifications: user can SELECT and UPDATE (is_read) own rows only.
- notification_settings: user can SELECT and UPSERT own row only.

## Notes
- Existing notification rows keep NULL target_type/preview_text — the UI
  handles nulls gracefully.
- The message notification trigger (from Phase 7) already exists and is
  not touched here.
- All trigger functions are SECURITY DEFINER to read across tables (post
  owners, settings) without RLS blocking.
*/

-- ============================================================================
-- EXTEND NOTIFICATIONS TABLE
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'target_type'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN target_type text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'preview_text'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN preview_text text;
  END IF;
END $$;

-- ============================================================================
-- NOTIFICATION_SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  likes_enabled boolean NOT NULL DEFAULT true,
  comments_enabled boolean NOT NULL DEFAULT true,
  follows_enabled boolean NOT NULL DEFAULT true,
  mentions_enabled boolean NOT NULL DEFAULT true,
  messages_enabled boolean NOT NULL DEFAULT true,
  echoes_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ns_select_own" ON notification_settings;
CREATE POLICY "ns_select_own" ON notification_settings FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ns_insert_own" ON notification_settings;
CREATE POLICY "ns_insert_own" ON notification_settings FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ns_update_own" ON notification_settings;
CREATE POLICY "ns_update_own" ON notification_settings FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- NOTIFICATIONS RLS (tighten: only owner can SELECT/UPDATE)
-- ============================================================================
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Allow INSERT via triggers (SECURITY DEFINER functions bypass RLS)
-- No direct INSERT policy needed — triggers run as definer.

-- ============================================================================
-- HELPER: check if a notification type is enabled for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notif_enabled(p_user_id uuid, p_type text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT
      CASE p_type
        WHEN 'like' THEN likes_enabled
        WHEN 'comment' THEN comments_enabled
        WHEN 'follow' THEN follows_enabled
        WHEN 'mention' THEN mentions_enabled
        WHEN 'message' THEN messages_enabled
        WHEN 'echo' THEN echoes_enabled
        ELSE true
      END
    FROM notification_settings WHERE user_id = p_user_id),
    true
  );
$$;

-- ============================================================================
-- TRIGGER: LIKE on post → notification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  post_owner uuid;
BEGIN
  IF NEW.target_type = 'post' THEN
    SELECT user_id INTO post_owner FROM public.posts WHERE id = NEW.target_id;
    IF post_owner IS NOT NULL AND post_owner <> NEW.user_id THEN
      IF public.notif_enabled(post_owner, 'like') THEN
        INSERT INTO public.notifications (user_id, from_user_id, type, target_id, target_type)
        VALUES (post_owner, NEW.user_id, 'like', NEW.target_id, 'post');
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_like ON likes;
CREATE TRIGGER trg_notify_on_like
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- ============================================================================
-- TRIGGER: COMMENT on post → notification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  post_owner uuid;
  preview text;
BEGIN
  SELECT user_id INTO post_owner FROM public.posts WHERE id = NEW.post_id;
  IF post_owner IS NOT NULL AND post_owner <> NEW.user_id THEN
    IF public.notif_enabled(post_owner, 'comment') THEN
      preview := left(NEW.content, 120);
      INSERT INTO public.notifications (user_id, from_user_id, type, target_id, target_type, preview_text)
      VALUES (post_owner, NEW.user_id, 'comment', NEW.post_id, 'post', preview);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- ============================================================================
-- TRIGGER: FOLLOW → notification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.following_id <> NEW.follower_id THEN
    IF public.notif_enabled(NEW.following_id, 'follow') THEN
      INSERT INTO public.notifications (user_id, from_user_id, type, target_id, target_type)
      VALUES (NEW.following_id, NEW.follower_id, 'follow', NEW.follower_id, 'profile');
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON follows;
CREATE TRIGGER trg_notify_on_follow
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- ============================================================================
-- TRIGGER: REPOST (echo) → notification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_echo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  original_owner uuid;
  preview text;
BEGIN
  IF NEW.repost_of IS NOT NULL THEN
    SELECT user_id INTO original_owner FROM public.posts WHERE id = NEW.repost_of;
    IF original_owner IS NOT NULL AND original_owner <> NEW.user_id THEN
      IF public.notif_enabled(original_owner, 'echo') THEN
        preview := left(NEW.content, 120);
        INSERT INTO public.notifications (user_id, from_user_id, type, target_id, target_type, preview_text)
        VALUES (original_owner, NEW.user_id, 'echo', NEW.repost_of, 'post', preview);
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_echo ON posts;
CREATE TRIGGER trg_notify_on_echo
  AFTER INSERT ON posts
  FOR EACH ROW WHEN (NEW.repost_of IS NOT NULL)
  EXECUTE FUNCTION public.notify_on_echo();

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
