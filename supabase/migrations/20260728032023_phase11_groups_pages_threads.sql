/*
# Phase 11A: Groups, Pages, Threads

## New Tables
### groups, group_members, group_posts — community groups
### pages, page_likes, page_admins — business/creator pages
### threads, thread_posts — connected post chains

## Security
- groups: visible to public or members; owner CRUD
- group_members: public read, self insert/delete, admin update
- group_posts: members read/insert, owner update, admin delete
- pages: public read, owner/admin CRUD
- page_likes: public read, self insert/delete
- page_admins: public read, owner insert/delete
- threads: public read, owner insert/delete
- thread_posts: public read, thread owner insert/delete
*/

-- ============================================================
-- CREATE ALL TABLES FIRST
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cover_url text,
  category text,
  rules text,
  privacy text NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'secret')),
  member_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_urls text[] NOT NULL DEFAULT '{}',
  media_type text NOT NULL DEFAULT 'text',
  pinned boolean NOT NULL DEFAULT false,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Business',
  description text,
  website text,
  contact_info text,
  cover_url text,
  profile_url text,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS page_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_id, user_id)
);

CREATE TABLE IF NOT EXISTS page_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_id, user_id)
);

CREATE TABLE IF NOT EXISTS threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS thread_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(thread_id, post_id)
);

-- ============================================================
-- ENABLE RLS + INDEXES
-- ============================================================
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_groups_privacy ON groups(privacy);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_group ON group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_thread_posts_thread ON thread_posts(thread_id);

-- ============================================================
-- POLICIES: GROUPS
-- ============================================================
DROP POLICY IF EXISTS "select_groups" ON groups;
CREATE POLICY "select_groups" ON groups FOR SELECT
  TO authenticated USING (
    privacy = 'public'
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_groups" ON groups;
CREATE POLICY "insert_groups" ON groups FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_groups" ON groups;
CREATE POLICY "update_groups" ON groups FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_groups" ON groups;
CREATE POLICY "delete_groups" ON groups FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- POLICIES: GROUP MEMBERS
-- ============================================================
DROP POLICY IF EXISTS "select_group_members" ON group_members;
CREATE POLICY "select_group_members" ON group_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_group_members" ON group_members;
CREATE POLICY "insert_group_members" ON group_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_group_members" ON group_members;
CREATE POLICY "update_group_members" ON group_members FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM group_members gm2 WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid() AND gm2.role IN ('admin', 'moderator'))
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM group_members gm3 WHERE gm3.group_id = group_members.group_id AND gm3.user_id = auth.uid() AND gm3.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_group_members" ON group_members;
CREATE POLICY "delete_group_members" ON group_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- POLICIES: GROUP POSTS
-- ============================================================
DROP POLICY IF EXISTS "select_group_posts" ON group_posts;
CREATE POLICY "select_group_posts" ON group_posts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_posts.group_id AND group_members.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM groups WHERE groups.id = group_posts.group_id AND groups.privacy = 'public')
  );

DROP POLICY IF EXISTS "insert_group_posts" ON group_posts;
CREATE POLICY "insert_group_posts" ON group_posts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_posts.group_id AND group_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_group_posts" ON group_posts;
CREATE POLICY "update_group_posts" ON group_posts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_group_posts" ON group_posts;
CREATE POLICY "delete_group_posts" ON group_posts FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_posts.group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator'))
  );

-- ============================================================
-- POLICIES: PAGES
-- ============================================================
DROP POLICY IF EXISTS "select_pages" ON pages;
CREATE POLICY "select_pages" ON pages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_pages" ON pages;
CREATE POLICY "insert_pages" ON pages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_pages" ON pages;
CREATE POLICY "update_pages" ON pages FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM page_admins WHERE page_admins.page_id = pages.id AND page_admins.user_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM page_admins WHERE page_admins.page_id = pages.id AND page_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_pages" ON pages;
CREATE POLICY "delete_pages" ON pages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- POLICIES: PAGE LIKES
-- ============================================================
DROP POLICY IF EXISTS "select_page_likes" ON page_likes;
CREATE POLICY "select_page_likes" ON page_likes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_page_likes" ON page_likes;
CREATE POLICY "insert_page_likes" ON page_likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_page_likes" ON page_likes;
CREATE POLICY "delete_page_likes" ON page_likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- POLICIES: PAGE ADMINS
-- ============================================================
DROP POLICY IF EXISTS "select_page_admins" ON page_admins;
CREATE POLICY "select_page_admins" ON page_admins FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_page_admins" ON page_admins;
CREATE POLICY "insert_page_admins" ON page_admins FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM page_admins pa WHERE pa.page_id = page_admins.page_id AND pa.user_id = auth.uid() AND pa.role = 'owner')
  );

DROP POLICY IF EXISTS "delete_page_admins" ON page_admins;
CREATE POLICY "delete_page_admins" ON page_admins FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM page_admins pa WHERE pa.page_id = page_admins.page_id AND pa.user_id = auth.uid() AND pa.role = 'owner')
  );

-- ============================================================
-- POLICIES: THREADS
-- ============================================================
DROP POLICY IF EXISTS "select_threads" ON threads;
CREATE POLICY "select_threads" ON threads FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_threads" ON threads;
CREATE POLICY "insert_threads" ON threads FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_threads" ON threads;
CREATE POLICY "delete_threads" ON threads FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- POLICIES: THREAD POSTS
-- ============================================================
DROP POLICY IF EXISTS "select_thread_posts" ON thread_posts;
CREATE POLICY "select_thread_posts" ON thread_posts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_thread_posts" ON thread_posts;
CREATE POLICY "insert_thread_posts" ON thread_posts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM threads WHERE threads.id = thread_posts.thread_id AND threads.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_thread_posts" ON thread_posts;
CREATE POLICY "delete_thread_posts" ON thread_posts FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM threads WHERE threads.id = thread_posts.thread_id AND threads.user_id = auth.uid())
  );
