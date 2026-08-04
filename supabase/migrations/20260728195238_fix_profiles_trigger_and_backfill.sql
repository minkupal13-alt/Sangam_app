/*
# Fix: Auto-create profile on signup + backfill existing users

## Problem
The `profiles` table was missing an `email` column, so the `handle_new_user` trigger
could not insert new profiles when users signed up via Supabase Auth. The 3 existing
auth users had no matching rows in `profiles`.

## Changes

### 1. Add `email` column to `profiles`
- New column: `email` (text, unique, nullable) — stores the user's auth email.
  Marked nullable so the backfill and existing rows don't break, but new signups
  always populate it.

### 2. Create `handle_new_user()` trigger function
- SECURITY DEFINER function that fires AFTER INSERT on `auth.users`.
- Inserts a new row into `profiles` using the new auth user's id, email, and a
  default username/full_name derived from the email prefix.
- Sets role to 'user' and created_at to NOW().
- ON CONFLICT (id) DO NOTHING makes it safe to re-run.

### 3. Create `on_auth_user_created` trigger
- AFTER INSERT on `auth.users`, FOR EACH ROW, executes `handle_new_user()`.
- Dropped first if it already exists (idempotent).

### 4. Backfill existing auth users
- INSERT INTO profiles ... SELECT FROM auth.users for all existing users who
  don't yet have a profile row. ON CONFLICT (id) DO NOTHING.

## Security
- The trigger function is SECURITY DEFINER so it can write to `profiles` even though
  the auth trigger runs in the auth context. RLS on `profiles` remains unchanged.
- No existing policies are modified.
*/

-- 1. Add email column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text UNIQUE;

-- 2. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    full_name,
    role,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    SPLIT_PART(NEW.email, '@', 1),
    SPLIT_PART(NEW.email, '@', 1),
    'user',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger (drop first for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Backfill profiles for existing auth users
INSERT INTO public.profiles (
  id, email, username, full_name, role, created_at
)
SELECT
  id,
  email,
  SPLIT_PART(email, '@', 1),
  SPLIT_PART(email, '@', 1),
  'user',
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;