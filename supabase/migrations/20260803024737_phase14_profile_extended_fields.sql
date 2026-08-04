/*
# Extend profiles with website, location, birthday, gender

1. Modified Tables
- `profiles`: Add 4 new nullable columns:
  - `website` (text) — personal website URL shown on profile
  - `location` (text) — user's city/country
  - `birthday` (date) — date of birth (nullable, privacy controlled client-side)
  - `gender` (text) — gender (optional)

2. Security
- No new tables. Existing profiles RLS policies already allow users to read all profiles and update their own.
- These columns inherit the same RLS policies as the profiles table.

3. Notes
- All columns are nullable so existing rows are unaffected.
- No data loss — purely additive.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'website') THEN
    ALTER TABLE profiles ADD COLUMN website text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE profiles ADD COLUMN location text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'birthday') THEN
    ALTER TABLE profiles ADD COLUMN birthday date;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
    ALTER TABLE profiles ADD COLUMN gender text;
  END IF;
END $$;
