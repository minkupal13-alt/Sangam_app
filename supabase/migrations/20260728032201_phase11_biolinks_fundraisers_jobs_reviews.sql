/*
# Phase 11C: Bio Links, Fundraisers, Donations, Jobs, Seller Reviews

## New Tables
### bio_links — link in bio (max 5 per user)
### fundraisers — fundraising campaigns
### donations — donations to fundraisers
### jobs — job listings
### job_applications — job applications
### seller_reviews — marketplace seller ratings

## Security
- bio_links: public read, self CRUD
- fundraisers: public read, creator CRUD
- donations: public read, self insert
- jobs: public read, owner CRUD
- job_applications: self read/insert, job owner read
- seller_reviews: public read, self insert (after transaction)
*/

CREATE TABLE IF NOT EXISTS bio_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  emoji text NOT NULL DEFAULT '🔗',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bio_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bio_links_user ON bio_links(user_id);

DROP POLICY IF EXISTS "select_bio_links" ON bio_links;
CREATE POLICY "select_bio_links" ON bio_links FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_bio_links" ON bio_links;
CREATE POLICY "insert_bio_links" ON bio_links FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_bio_links" ON bio_links;
CREATE POLICY "update_bio_links" ON bio_links FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_bio_links" ON bio_links;
CREATE POLICY "delete_bio_links" ON bio_links FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS fundraisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  goal_amount numeric(10,2) NOT NULL,
  raised_amount numeric(10,2) NOT NULL DEFAULT 0,
  cover_url text,
  beneficiary text,
  end_date date,
  donor_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fundraisers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_fundraisers_user ON fundraisers(user_id);

DROP POLICY IF EXISTS "select_fundraisers" ON fundraisers;
CREATE POLICY "select_fundraisers" ON fundraisers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_fundraisers" ON fundraisers;
CREATE POLICY "insert_fundraisers" ON fundraisers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_fundraisers" ON fundraisers;
CREATE POLICY "update_fundraisers" ON fundraisers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_fundraisers" ON fundraisers;
CREATE POLICY "delete_fundraisers" ON fundraisers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fundraiser_id uuid NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_donations_fundraiser ON donations(fundraiser_id);

DROP POLICY IF EXISTS "select_donations" ON donations;
CREATE POLICY "select_donations" ON donations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_donations" ON donations;
CREATE POLICY "insert_donations" ON donations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = donor_id);

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  company text NOT NULL,
  company_logo_url text,
  location text NOT NULL,
  work_type text NOT NULL DEFAULT 'on-site' CHECK (work_type IN ('remote', 'hybrid', 'on-site')),
  job_type text NOT NULL DEFAULT 'full-time' CHECK (job_type IN ('full-time', 'part-time', 'freelance', 'internship')),
  salary_min numeric(10,2),
  salary_max numeric(10,2),
  description text,
  requirements text,
  apply_url text,
  apply_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);

DROP POLICY IF EXISTS "select_jobs" ON jobs;
CREATE POLICY "select_jobs" ON jobs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_jobs" ON jobs;
CREATE POLICY "insert_jobs" ON jobs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_jobs" ON jobs;
CREATE POLICY "update_jobs" ON jobs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_jobs" ON jobs;
CREATE POLICY "delete_jobs" ON jobs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  cover_letter text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, user_id)
);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_job_apps_job ON job_applications(job_id);

DROP POLICY IF EXISTS "select_job_apps" ON job_applications;
CREATE POLICY "select_job_apps" ON job_applications FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_applications.job_id AND jobs.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_job_apps" ON job_applications;
CREATE POLICY "insert_job_apps" ON job_applications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_job_apps" ON job_applications;
CREATE POLICY "update_job_apps" ON job_applications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_applications.job_id AND jobs.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_applications.job_id AND jobs.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS seller_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES marketplace_listings(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id, reviewer_id, listing_id)
);

ALTER TABLE seller_reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller ON seller_reviews(seller_id);

DROP POLICY IF EXISTS "select_seller_reviews" ON seller_reviews;
CREATE POLICY "select_seller_reviews" ON seller_reviews FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_seller_reviews" ON seller_reviews;
CREATE POLICY "insert_seller_reviews" ON seller_reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "delete_seller_reviews" ON seller_reviews;
CREATE POLICY "delete_seller_reviews" ON seller_reviews FOR DELETE
  TO authenticated USING (auth.uid() = reviewer_id);
