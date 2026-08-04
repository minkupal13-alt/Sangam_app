/*
# Phase 13: Admin Panel Schema

## Summary
Adds role column to profiles and creates 5 admin tables.

## New Tables
1. platform_settings — feature toggles and config
2. audit_logs — append-only admin action log
3. announcements — platform-wide announcements
4. support_tickets — user support tickets
5. ticket_messages — messages in support ticket threads

## Security
- is_admin() and is_staff() security-definer helper functions
- RLS on all tables
*/

-- Add role column to profiles FIRST (functions depend on it)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'creator', 'moderator', 'admin', 'superadmin'));

-- Helper functions (must come after role column exists)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('moderator', 'admin', 'superadmin')
  );
$$;

-- 1. platform_settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  new_signups_enabled boolean NOT NULL DEFAULT true,
  google_oauth_enabled boolean NOT NULL DEFAULT false,
  marketplace_enabled boolean NOT NULL DEFAULT true,
  live_streaming_enabled boolean NOT NULL DEFAULT true,
  audio_rooms_enabled boolean NOT NULL DEFAULT true,
  monetization_enabled boolean NOT NULL DEFAULT true,
  tips_enabled boolean NOT NULL DEFAULT true,
  subscriptions_enabled boolean NOT NULL DEFAULT true,
  coins_enabled boolean NOT NULL DEFAULT true,
  jobs_enabled boolean NOT NULL DEFAULT true,
  fundraisers_enabled boolean NOT NULL DEFAULT true,
  podcasts_enabled boolean NOT NULL DEFAULT true,
  groups_enabled boolean NOT NULL DEFAULT true,
  pages_enabled boolean NOT NULL DEFAULT true,
  watch_party_enabled boolean NOT NULL DEFAULT true,
  duet_stitch_enabled boolean NOT NULL DEFAULT true,
  post_scheduling_enabled boolean NOT NULL DEFAULT true,
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text DEFAULT '',
  blocked_words text[] DEFAULT '{}',
  max_file_size_mb integer DEFAULT 50,
  max_video_duration_min integer DEFAULT 30,
  max_post_length integer DEFAULT 500,
  daily_post_limit integer DEFAULT 50,
  min_withdrawal_amount integer DEFAULT 100,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_platform_settings ON platform_settings;
CREATE POLICY read_platform_settings ON platform_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS update_platform_settings ON platform_settings;
CREATE POLICY update_platform_settings ON platform_settings
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.platform_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- 2. audit_logs (append-only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_audit_logs ON audit_logs;
CREATE POLICY read_audit_logs ON audit_logs
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS insert_audit_logs ON audit_logs;
CREATE POLICY insert_audit_logs ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);

-- 3. announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'update', 'event')),
  target text NOT NULL DEFAULT 'all' CHECK (target IN ('all', 'role', 'country')),
  target_value text DEFAULT '',
  channels text[] NOT NULL DEFAULT '{pulse}',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  scheduled_for timestamptz,
  expires_at timestamptz,
  is_emergency boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_announcements ON announcements;
CREATE POLICY read_announcements ON announcements
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS insert_announcements ON announcements;
CREATE POLICY insert_announcements ON announcements
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS update_announcements ON announcements;
CREATE POLICY update_announcements ON announcements
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS delete_announcements ON announcements;
CREATE POLICY delete_announcements ON announcements
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_announcements_scheduled ON public.announcements(scheduled_for);

-- 4. support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text DEFAULT 'general',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_support_tickets ON support_tickets;
CREATE POLICY read_support_tickets ON support_tickets
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS insert_support_tickets ON support_tickets;
CREATE POLICY insert_support_tickets ON support_tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS update_support_tickets ON support_tickets;
CREATE POLICY update_support_tickets ON support_tickets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_staff()) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

-- 5. ticket_messages
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_admin_reply boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_ticket_messages ON ticket_messages;
CREATE POLICY read_ticket_messages ON ticket_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = ticket_messages.ticket_id
      AND (support_tickets.user_id = auth.uid() OR public.is_staff())
    )
  );

DROP POLICY IF EXISTS insert_ticket_messages ON ticket_messages;
CREATE POLICY insert_ticket_messages ON ticket_messages
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = ticket_messages.ticket_id
      AND (support_tickets.user_id = auth.uid() OR public.is_staff())
    )
  );

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON public.ticket_messages(created_at);
