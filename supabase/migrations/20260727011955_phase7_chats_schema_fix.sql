/*
# Phase 7 — Chats (Realtime Direct Messages) — Schema Fix

## Overview
The pre-existing `conversations` and `messages` tables had an incompatible
schema (simple 1:1 only). Both tables were empty. This migration drops them
and recreates with the proper Phase 7 schema supporting groups, participants,
realtime, read receipts, and soft delete.

## Tables
1. conversations — is_group, group_name, group_avatar, created_by, created_at
2. conversation_participants — conversation_id, user_id, is_admin, last_read_at
3. messages — conversation_id, sender_id, content, media_url, reply_to, created_at, deleted_at
4. message_reads — message_id, user_id, read_at

## Security
- conversations: participants SELECT; creator INSERT/UPDATE/DELETE
- conversation_participants: participants SELECT; self INSERT; self UPDATE; admin DELETE
- messages: participants SELECT/INSERT; sender UPDATE/DELETE own
- message_reads: owner SELECT/INSERT

## Notes
- Old empty conversations/messages tables dropped (no data loss).
- Tables created in dependency order: conversations → participants → messages → message_reads.
- Helper function and policies created AFTER all tables exist.
*/

-- Drop old incompatible empty tables
DROP TABLE IF EXISTS message_reads CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- ============================================================================
-- 1. CONVERSATIONS
-- ============================================================================
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  group_name text,
  group_avatar text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CONVERSATION PARTICIPANTS
-- ============================================================================
CREATE TABLE conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  is_admin boolean NOT NULL DEFAULT false,
  last_read_at timestamptz DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cp_conversation ON conversation_participants (conversation_id);
CREATE INDEX idx_cp_user ON conversation_participants (user_id);

-- ============================================================================
-- 3. MESSAGES
-- ============================================================================
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  media_url text,
  reply_to_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);

-- ============================================================================
-- 4. MESSAGE READS
-- ============================================================================
CREATE TABLE message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_message_reads_message ON message_reads (message_id);

-- ============================================================================
-- HELPER FUNCTION (after all tables exist)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

-- ============================================================================
-- RLS POLICIES: conversations
-- ============================================================================
DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;
CREATE POLICY "conversations_select_participant" ON conversations FOR SELECT
  TO authenticated USING (public.is_conversation_participant(id));

DROP POLICY IF EXISTS "conversations_insert_own" ON conversations;
CREATE POLICY "conversations_insert_own" ON conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "conversations_update_creator" ON conversations;
CREATE POLICY "conversations_update_creator" ON conversations FOR UPDATE
  TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "conversations_delete_creator" ON conversations;
CREATE POLICY "conversations_delete_creator" ON conversations FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- ============================================================================
-- RLS POLICIES: conversation_participants
-- ============================================================================
DROP POLICY IF EXISTS "cp_select_participant" ON conversation_participants;
CREATE POLICY "cp_select_participant" ON conversation_participants FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cp_insert_participant" ON conversation_participants;
CREATE POLICY "cp_insert_participant" ON conversation_participants FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid() AND cp.is_admin
    )
  );

DROP POLICY IF EXISTS "cp_update_own" ON conversation_participants;
CREATE POLICY "cp_update_own" ON conversation_participants FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cp_delete_admin" ON conversation_participants;
CREATE POLICY "cp_delete_admin" ON conversation_participants FOR DELETE
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid() AND cp.is_admin
    )
  );

-- ============================================================================
-- RLS POLICIES: messages
-- ============================================================================
DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant" ON messages FOR SELECT
  TO authenticated USING (public.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT
  TO authenticated WITH CHECK (public.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS "messages_update_own" ON messages;
CREATE POLICY "messages_update_own" ON messages FOR UPDATE
  TO authenticated USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "messages_delete_own" ON messages;
CREATE POLICY "messages_delete_own" ON messages FOR DELETE
  TO authenticated USING (sender_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: message_reads
-- ============================================================================
DROP POLICY IF EXISTS "message_reads_select_own" ON message_reads;
CREATE POLICY "message_reads_select_own" ON message_reads FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "message_reads_insert_own" ON message_reads;
CREATE POLICY "message_reads_insert_own" ON message_reads FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- ============================================================================
-- NOTIFICATION TRIGGER ON NEW MESSAGE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  participant record;
BEGIN
  FOR participant IN
    SELECT user_id FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id <> NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, from_user_id, type, target_id)
    VALUES (participant.user_id, NEW.sender_id, 'message', NEW.conversation_id);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();
