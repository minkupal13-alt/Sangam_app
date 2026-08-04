/*
# Phase 11D: Bookmarks, Drafts, Highlights, Muted Words, Sessions, Interests, Verification, Close Friends, Insights, Comment Filters

## New Tables
### bookmark_collections — collections of saved posts
### drafts — saved post drafts
### story_highlights — highlight albums on profile
### highlight_stories — stories saved to highlights
### muted_words — user-muted words/hashtags
### user_sessions — active login sessions
### user_interests — user interest tags for feed algorithm
### verification_requests — verified creator applications
### close_friends — close friends list
### post_insights — view tracking per post
### comment_filters — blocked keywords for comment moderation

## Security
- bookmark_collections: self CRUD
- drafts: self CRUD
- story_highlights: public read, self CRUD
- highlight_stories: public read, self CRUD
- muted_words: self CRUD
- user_sessions: self read/delete
- user_interests: public read, self CRUD
- verification_requests: self read/insert, admin update (self for now)
- close_friends: self CRUD
- post_insights: self insert, post owner read
- comment_filters: self CRUD (per post)
*/

CREATE TABLE IF NOT EXISTS bookmark_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookmark_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_bookmark_collections" ON bookmark_collections;
CREATE POLICY "select_bookmark_collections" ON bookmark_collections FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_bookmark_collections" ON bookmark_collections;
CREATE POLICY "insert_bookmark_collections" ON bookmark_collections FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_bookmark_collections" ON bookmark_collections;
CREATE POLICY "update_bookmark_collections" ON bookmark_collections FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_bookmark_collections" ON bookmark_collections;
CREATE POLICY "delete_bookmark_collections" ON bookmark_collections FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  media_urls text[] NOT NULL DEFAULT '{}',
  media_type text NOT NULL DEFAULT 'text',
  post_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_drafts" ON drafts;
CREATE POLICY "select_drafts" ON drafts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_drafts" ON drafts;
CREATE POLICY "insert_drafts" ON drafts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_drafts" ON drafts;
CREATE POLICY "update_drafts" ON drafts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_drafts" ON drafts;
CREATE POLICY "delete_drafts" ON drafts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS story_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE story_highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_story_highlights" ON story_highlights;
CREATE POLICY "select_story_highlights" ON story_highlights FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_story_highlights" ON story_highlights;
CREATE POLICY "insert_story_highlights" ON story_highlights FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_story_highlights" ON story_highlights;
CREATE POLICY "update_story_highlights" ON story_highlights FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_story_highlights" ON story_highlights;
CREATE POLICY "delete_story_highlights" ON story_highlights FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS highlight_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id uuid NOT NULL REFERENCES story_highlights(id) ON DELETE CASCADE,
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE highlight_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_highlight_stories" ON highlight_stories;
CREATE POLICY "select_highlight_stories" ON highlight_stories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_highlight_stories" ON highlight_stories;
CREATE POLICY "insert_highlight_stories" ON highlight_stories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM story_highlights WHERE story_highlights.id = highlight_stories.highlight_id AND story_highlights.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_highlight_stories" ON highlight_stories;
CREATE POLICY "delete_highlight_stories" ON highlight_stories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM story_highlights WHERE story_highlights.id = highlight_stories.highlight_id AND story_highlights.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS muted_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  word text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, word)
);

ALTER TABLE muted_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_muted_words" ON muted_words;
CREATE POLICY "select_muted_words" ON muted_words FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_muted_words" ON muted_words;
CREATE POLICY "insert_muted_words" ON muted_words FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_muted_words" ON muted_words;
CREATE POLICY "delete_muted_words" ON muted_words FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  device_info text,
  location text,
  ip_masked text,
  last_active timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_user_sessions" ON user_sessions;
CREATE POLICY "select_user_sessions" ON user_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_user_sessions" ON user_sessions;
CREATE POLICY "insert_user_sessions" ON user_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_user_sessions" ON user_sessions;
CREATE POLICY "delete_user_sessions" ON user_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  interest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, interest)
);

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_user_interests" ON user_interests;
CREATE POLICY "select_user_interests" ON user_interests FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_user_interests" ON user_interests;
CREATE POLICY "insert_user_interests" ON user_interests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_user_interests" ON user_interests;
CREATE POLICY "delete_user_interests" ON user_interests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('Creator', 'Business', 'Public Figure', 'Brand')),
  reason text,
  social_links text,
  id_proof_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_verification_requests" ON verification_requests;
CREATE POLICY "select_verification_requests" ON verification_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_verification_requests" ON verification_requests;
CREATE POLICY "insert_verification_requests" ON verification_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_verification_requests" ON verification_requests;
CREATE POLICY "update_verification_requests" ON verification_requests FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS close_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE close_friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_close_friends" ON close_friends;
CREATE POLICY "select_close_friends" ON close_friends FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_close_friends" ON close_friends;
CREATE POLICY "insert_close_friends" ON close_friends FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_close_friends" ON close_friends;
CREATE POLICY "delete_close_friends" ON close_friends FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS post_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE post_insights ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_post_insights_post ON post_insights(post_id);

DROP POLICY IF EXISTS "insert_post_insights" ON post_insights;
CREATE POLICY "insert_post_insights" ON post_insights FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "select_post_insights" ON post_insights;
CREATE POLICY "select_post_insights" ON post_insights FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_insights.post_id AND posts.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS comment_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  blocked_words text[] NOT NULL DEFAULT '{}',
  comments_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id)
);

ALTER TABLE comment_filters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_comment_filters" ON comment_filters;
CREATE POLICY "select_comment_filters" ON comment_filters FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_comment_filters" ON comment_filters;
CREATE POLICY "insert_comment_filters" ON comment_filters FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_comment_filters" ON comment_filters;
CREATE POLICY "update_comment_filters" ON comment_filters FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_comment_filters" ON comment_filters;
CREATE POLICY "delete_comment_filters" ON comment_filters FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
