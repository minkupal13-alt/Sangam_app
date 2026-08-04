/*
# Phase 11B: Sounds, Watch Parties, Podcasts, Newsletters

## New Tables
### sounds — music/audio library for flicks/stories
### watch_parties — synchronized video viewing
### party_members — participants in a watch party
### podcasts — podcast channels
### episodes — podcast episodes
### podcast_subscriptions — subscribe to podcasts
### newsletters — creator newsletters
### newsletter_posts — newsletter articles
### newsletter_subscribers — subscribers

## Security
- sounds: public read, self insert/update
- watch_parties: public read, host CRUD
- party_members: public read, self insert/delete
- podcasts: public read, owner CRUD
- episodes: public read, podcast owner CRUD
- podcast_subscriptions: self CRUD
- newsletters: public read, owner CRUD
- newsletter_posts: public read, newsletter owner CRUD
- newsletter_subscribers: self CRUD
*/

-- ============================================================
-- CREATE ALL TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS sounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text,
  audio_url text NOT NULL,
  duration_seconds integer,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watch_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  play_position integer NOT NULL DEFAULT 0,
  is_playing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS party_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES watch_parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(party_id, user_id)
);

CREATE TABLE IF NOT EXISTS podcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_url text,
  category text,
  subscriber_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id uuid NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  audio_url text NOT NULL,
  duration_seconds integer,
  episode_number integer,
  season integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS podcast_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id uuid NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(podcast_id, user_id)
);

CREATE TABLE IF NOT EXISTS newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  subscriber_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS newsletter_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(newsletter_id, user_id)
);

-- ============================================================
-- ENABLE RLS + INDEXES
-- ============================================================
ALTER TABLE sounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sounds_usage ON sounds(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_watch_parties_status ON watch_parties(status);
CREATE INDEX IF NOT EXISTS idx_party_members_party ON party_members(party_id);
CREATE INDEX IF NOT EXISTS idx_episodes_podcast ON episodes(podcast_id);
CREATE INDEX IF NOT EXISTS idx_podcast_subs_user ON podcast_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_posts_nl ON newsletter_posts(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subs_user ON newsletter_subscribers(user_id);

-- ============================================================
-- POLICIES: SOUNDS
-- ============================================================
DROP POLICY IF EXISTS "select_sounds" ON sounds;
CREATE POLICY "select_sounds" ON sounds FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_sounds" ON sounds;
CREATE POLICY "insert_sounds" ON sounds FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = uploader_id);

DROP POLICY IF EXISTS "update_sounds" ON sounds;
CREATE POLICY "update_sounds" ON sounds FOR UPDATE
  TO authenticated USING (auth.uid() = uploader_id) WITH CHECK (auth.uid() = uploader_id);

-- ============================================================
-- POLICIES: WATCH PARTIES
-- ============================================================
DROP POLICY IF EXISTS "select_watch_parties" ON watch_parties;
CREATE POLICY "select_watch_parties" ON watch_parties FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_watch_parties" ON watch_parties;
CREATE POLICY "insert_watch_parties" ON watch_parties FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "update_watch_parties" ON watch_parties;
CREATE POLICY "update_watch_parties" ON watch_parties FOR UPDATE
  TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "delete_watch_parties" ON watch_parties;
CREATE POLICY "delete_watch_parties" ON watch_parties FOR DELETE
  TO authenticated USING (auth.uid() = host_id);

-- ============================================================
-- POLICIES: PARTY MEMBERS
-- ============================================================
DROP POLICY IF EXISTS "select_party_members" ON party_members;
CREATE POLICY "select_party_members" ON party_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_party_members" ON party_members;
CREATE POLICY "insert_party_members" ON party_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_party_members" ON party_members;
CREATE POLICY "delete_party_members" ON party_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- POLICIES: PODCASTS
-- ============================================================
DROP POLICY IF EXISTS "select_podcasts" ON podcasts;
CREATE POLICY "select_podcasts" ON podcasts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_podcasts" ON podcasts;
CREATE POLICY "insert_podcasts" ON podcasts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_podcasts" ON podcasts;
CREATE POLICY "update_podcasts" ON podcasts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_podcasts" ON podcasts;
CREATE POLICY "delete_podcasts" ON podcasts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- POLICIES: EPISODES
-- ============================================================
DROP POLICY IF EXISTS "select_episodes" ON episodes;
CREATE POLICY "select_episodes" ON episodes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_episodes" ON episodes;
CREATE POLICY "insert_episodes" ON episodes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM podcasts WHERE podcasts.id = episodes.podcast_id AND podcasts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_episodes" ON episodes;
CREATE POLICY "update_episodes" ON episodes FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM podcasts WHERE podcasts.id = episodes.podcast_id AND podcasts.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM podcasts WHERE podcasts.id = episodes.podcast_id AND podcasts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_episodes" ON episodes;
CREATE POLICY "delete_episodes" ON episodes FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM podcasts WHERE podcasts.id = episodes.podcast_id AND podcasts.user_id = auth.uid())
  );

-- ============================================================
-- POLICIES: PODCAST SUBSCRIPTIONS
-- ============================================================
DROP POLICY IF EXISTS "select_podcast_subs" ON podcast_subscriptions;
CREATE POLICY "select_podcast_subs" ON podcast_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_podcast_subs" ON podcast_subscriptions;
CREATE POLICY "insert_podcast_subs" ON podcast_subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_podcast_subs" ON podcast_subscriptions;
CREATE POLICY "delete_podcast_subs" ON podcast_subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- POLICIES: NEWSLETTERS
-- ============================================================
DROP POLICY IF EXISTS "select_newsletters" ON newsletters;
CREATE POLICY "select_newsletters" ON newsletters FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_newsletters" ON newsletters;
CREATE POLICY "insert_newsletters" ON newsletters FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_newsletters" ON newsletters;
CREATE POLICY "update_newsletters" ON newsletters FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_newsletters" ON newsletters;
CREATE POLICY "delete_newsletters" ON newsletters FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- POLICIES: NEWSLETTER POSTS
-- ============================================================
DROP POLICY IF EXISTS "select_newsletter_posts" ON newsletter_posts;
CREATE POLICY "select_newsletter_posts" ON newsletter_posts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_newsletter_posts" ON newsletter_posts;
CREATE POLICY "insert_newsletter_posts" ON newsletter_posts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM newsletters WHERE newsletters.id = newsletter_posts.newsletter_id AND newsletters.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_newsletter_posts" ON newsletter_posts;
CREATE POLICY "update_newsletter_posts" ON newsletter_posts FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM newsletters WHERE newsletters.id = newsletter_posts.newsletter_id AND newsletters.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM newsletters WHERE newsletters.id = newsletter_posts.newsletter_id AND newsletters.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_newsletter_posts" ON newsletter_posts;
CREATE POLICY "delete_newsletter_posts" ON newsletter_posts FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM newsletters WHERE newsletters.id = newsletter_posts.newsletter_id AND newsletters.user_id = auth.uid())
  );

-- ============================================================
-- POLICIES: NEWSLETTER SUBSCRIBERS
-- ============================================================
DROP POLICY IF EXISTS "select_newsletter_subs" ON newsletter_subscribers;
CREATE POLICY "select_newsletter_subs" ON newsletter_subscribers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_newsletter_subs" ON newsletter_subscribers;
CREATE POLICY "insert_newsletter_subs" ON newsletter_subscribers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_newsletter_subs" ON newsletter_subscribers;
CREATE POLICY "delete_newsletter_subs" ON newsletter_subscribers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
