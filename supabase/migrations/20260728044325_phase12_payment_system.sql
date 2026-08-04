/*
# Phase 12: Complete Payment System (Razorpay)

## What this migration does
Creates the full payment infrastructure for Sangam — virtual coins, tips, subscriptions, post boosts, marketplace orders, fundraiser donations, creator payouts, live gifts, and referrals.

## New Tables (12 tables)

### wallets — user coin/cash balance
### coin_transactions — history of all coin movements
### coin_purchases — coin package purchases via Razorpay
### tips — creator tips (coins or direct payment)
### boosted_posts — promoted posts with coin/pay boost
### orders — marketplace purchase orders
### donations — fundraiser donations
### payouts — creator withdrawal requests
### live_gifts — gifts sent during live streams
### referrals — referral tracking and rewards

## Modified Tables
### tips — already exists from Phase 10, ADD columns for coins + razorpay
### subscriptions — already exists, ADD columns for amount + razorpay_subscription_id
### donations — already exists from Phase 11, ADD columns for razorpay + anonymous

## Security (RLS)
- wallets: owner-only read/update
- coin_transactions: owner-only read, self insert
- coin_purchases: owner-only read, self insert
- tips: public read, self insert (already exists — add columns)
- boosted_posts: public read, owner insert
- orders: buyer+seller read, buyer insert, seller update
- donations: public read, self insert (already exists — add columns)
- payouts: owner-only read, self insert
- live_gifts: public read, self insert
- referrals: referrer read, self insert (on signup)
*/

-- ============================================================
-- WALLETS
-- ============================================================
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  coins_balance integer NOT NULL DEFAULT 0,
  cash_balance numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_wallets" ON wallets;
CREATE POLICY "select_wallets" ON wallets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_wallets" ON wallets;
CREATE POLICY "insert_wallets" ON wallets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_wallets" ON wallets;
CREATE POLICY "update_wallets" ON wallets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- COIN TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('earned', 'spent', 'bought')),
  amount integer NOT NULL,
  description text,
  ref_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_coin_tx_user ON coin_transactions(user_id);

DROP POLICY IF EXISTS "select_coin_transactions" ON coin_transactions;
CREATE POLICY "select_coin_transactions" ON coin_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_coin_transactions" ON coin_transactions;
CREATE POLICY "insert_coin_transactions" ON coin_transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- COIN PURCHASES
-- ============================================================
CREATE TABLE IF NOT EXISTS coin_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  coins integer NOT NULL,
  amount_paid numeric(10,2) NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coin_purchases ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_coin_purchases_user ON coin_purchases(user_id);

DROP POLICY IF EXISTS "select_coin_purchases" ON coin_purchases;
CREATE POLICY "select_coin_purchases" ON coin_purchases FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_coin_purchases" ON coin_purchases;
CREATE POLICY "insert_coin_purchases" ON coin_purchases FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_coin_purchases" ON coin_purchases;
CREATE POLICY "update_coin_purchases" ON coin_purchases FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TIPS — add columns to existing tips table
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tips' AND column_name = 'coins_used') THEN
    ALTER TABLE tips ADD COLUMN coins_used integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tips' AND column_name = 'currency') THEN
    ALTER TABLE tips ADD COLUMN currency text DEFAULT 'INR';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tips' AND column_name = 'razorpay_payment_id') THEN
    ALTER TABLE tips ADD COLUMN razorpay_payment_id text;
  END IF;
END $$;

-- ============================================================
-- SUBSCRIPTIONS — add columns to existing subscriptions table
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'amount') THEN
    ALTER TABLE subscriptions ADD COLUMN amount numeric(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'expires_at') THEN
    ALTER TABLE subscriptions ADD COLUMN expires_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'razorpay_subscription_id') THEN
    ALTER TABLE subscriptions ADD COLUMN razorpay_subscription_id text;
  END IF;
END $$;

-- ============================================================
-- DONATIONS — add columns to existing donations table
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'donations' AND column_name = 'is_anonymous') THEN
    ALTER TABLE donations ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'donations' AND column_name = 'razorpay_payment_id') THEN
    ALTER TABLE donations ADD COLUMN razorpay_payment_id text;
  END IF;
END $$;

-- ============================================================
-- BOOSTED POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS boosted_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  coins_spent integer NOT NULL DEFAULT 0,
  amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  reach_target integer NOT NULL DEFAULT 0,
  extra_views integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended'))
);

ALTER TABLE boosted_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_boosted_posts_post ON boosted_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_boosted_posts_status ON boosted_posts(status);

DROP POLICY IF EXISTS "select_boosted_posts" ON boosted_posts;
CREATE POLICY "select_boosted_posts" ON boosted_posts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_boosted_posts" ON boosted_posts;
CREATE POLICY "insert_boosted_posts" ON boosted_posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_boosted_posts" ON boosted_posts;
CREATE POLICY "update_boosted_posts" ON boosted_posts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ORDERS (Marketplace)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  platform_fee numeric(10,2) NOT NULL DEFAULT 0,
  net_to_seller numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed')),
  delivery_address jsonb,
  razorpay_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

DROP POLICY IF EXISTS "select_orders" ON orders;
CREATE POLICY "select_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "insert_orders" ON orders;
CREATE POLICY "insert_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "update_orders" ON orders;
CREATE POLICY "update_orders" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ============================================================
-- PAYOUTS (Creator withdrawals)
-- ============================================================
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  platform_fee numeric(10,2) NOT NULL DEFAULT 0,
  net_amount numeric(10,2) NOT NULL DEFAULT 0,
  method text NOT NULL CHECK (method IN ('bank', 'upi')),
  account_details jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  transaction_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payouts_creator ON payouts(creator_id);

DROP POLICY IF EXISTS "select_payouts" ON payouts;
CREATE POLICY "select_payouts" ON payouts FOR SELECT
  TO authenticated USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "insert_payouts" ON payouts;
CREATE POLICY "insert_payouts" ON payouts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = creator_id);

-- ============================================================
-- LIVE GIFTS
-- ============================================================
CREATE TABLE IF NOT EXISTS live_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stream_id uuid REFERENCES live_streams(id) ON DELETE CASCADE,
  gift_type text NOT NULL,
  coins_spent integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE live_gifts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_live_gifts_stream ON live_gifts(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_gifts_creator ON live_gifts(creator_id);

DROP POLICY IF EXISTS "select_live_gifts" ON live_gifts;
CREATE POLICY "select_live_gifts" ON live_gifts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_live_gifts" ON live_gifts;
CREATE POLICY "insert_live_gifts" ON live_gifts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

-- ============================================================
-- REFERRALS
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'first_payment', 'rewarded')),
  coins_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);

DROP POLICY IF EXISTS "select_referrals" ON referrals;
CREATE POLICY "select_referrals" ON referrals FOR SELECT
  TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "insert_referrals" ON referrals;
CREATE POLICY "insert_referrals" ON referrals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = referrer_id);
