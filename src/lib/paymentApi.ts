import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';

export const COIN_PACKAGES = [
  { coins: 100, price: 10, label: '100 Coins', discount: null },
  { coins: 500, price: 45, label: '500 Coins', discount: '10% OFF' },
  { coins: 1000, price: 80, label: '1000 Coins', discount: '20% OFF' },
  { coins: 5000, price: 350, label: '5000 Coins', discount: '30% OFF' },
];

export const BOOST_OPTIONS = [
  { coins: 100, price: 10, reach: 500, duration: '24h' },
  { coins: 250, price: 25, reach: 1500, duration: '24h' },
  { coins: 500, price: 50, reach: 4000, duration: '48h' },
];

export const LIVE_GIFTS = [
  { type: 'rose', emoji: '🌹', name: 'Rose', coins: 1 },
  { type: 'candy', emoji: '🍭', name: 'Candy', coins: 5 },
  { type: 'diamond', emoji: '💎', name: 'Diamond', coins: 50 },
  { type: 'rocket', emoji: '🚀', name: 'Rocket', coins: 100 },
  { type: 'crown', emoji: '👑', name: 'Crown', coins: 500 },
  { type: 'fire_heart', emoji: '❤️‍🔥', name: 'Fire Heart', coins: 1000 },
];

export interface Wallet {
  id: string;
  user_id: string;
  coins_balance: number;
  cash_balance: number;
  updated_at: string;
}

export interface CoinTransaction {
  id: string;
  user_id: string;
  type: 'earned' | 'spent' | 'bought';
  amount: number;
  description: string | null;
  ref_id: string | null;
  created_at: string;
}

export async function getWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) {
    // Create wallet if it doesn't exist
    const { data: newWallet } = await supabase
      .from('wallets')
      .insert({ user_id: userId })
      .select('*')
      .single();
    return newWallet;
  }
  return data;
}

export async function getCoinTransactions(userId: string, limit = 50): Promise<CoinTransaction[]> {
  const { data, error } = await supabase
    .from('coin_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data;
}

export async function spendCoins(userId: string, amount: number, description: string, refId?: string): Promise<boolean> {
  const wallet = await getWallet(userId);
  if (!wallet || wallet.coins_balance < amount) return false;

  await supabase
    .from('wallets')
    .update({ coins_balance: wallet.coins_balance - amount, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  await supabase.from('coin_transactions').insert({
    user_id: userId,
    type: 'spent',
    amount: -amount,
    description,
    ref_id: refId || null,
  });

  return true;
}

export async function earnCoins(userId: string, amount: number, description: string, refId?: string): Promise<void> {
  const wallet = await getWallet(userId);
  if (!wallet) return;

  await supabase
    .from('wallets')
    .update({ coins_balance: wallet.coins_balance + amount, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  await supabase.from('coin_transactions').insert({
    user_id: userId,
    type: 'earned',
    amount,
    description,
    ref_id: refId || null,
  });
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function getSupabaseUrl(): Promise<string> {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return url;
}

export async function createRazorpayOrder(amount: number, type: string, refId?: string, description?: string): Promise<{ order_id: string; key_id: string } | null> {
  const token = await getAuthToken();
  const supabaseUrl = await getSupabaseUrl();

  const response = await fetch(`${supabaseUrl}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount, type, ref_id: refId, description }),
  });

  if (!response.ok) {
    console.error('Failed to create Razorpay order');
    return null;
  }

  return response.json();
}

export async function verifyRazorpayPayment(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  type: string;
  ref_id?: string;
  amount: number;
  coins?: number;
}): Promise<boolean> {
  const token = await getAuthToken();
  const supabaseUrl = await getSupabaseUrl();

  const response = await fetch(`${supabaseUrl}/functions/v1/verify-razorpay-payment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) return false;
  const data = await response.json();
  return data.verified === true;
}

export async function openRazorpayCheckout(params: {
  amount: number;
  orderId: string;
  keyId: string;
  name: string;
  description: string;
  onSuccess: (paymentId: string, signature: string, orderId: string) => void;
  onFailure?: (error: unknown) => void;
}): Promise<void> {
  const profile = useAuthStore.getState().profile;

  const options = {
    key: params.keyId,
    amount: Math.round(params.amount * 100),
    currency: 'INR',
    name: params.name,
    description: params.description,
    order_id: params.orderId,
    prefill: {
      name: profile?.full_name || '',
      email: '',
    },
    theme: { color: '#0EA5A4' },
    handler: (response: { razorpay_payment_id: string; razorpay_signature: string; razorpay_order_id: string }) => {
      params.onSuccess(response.razorpay_payment_id, response.razorpay_signature, response.razorpay_order_id);
    },
    modal: {
      ondismiss: () => {
        params.onFailure?.(new Error('Payment cancelled'));
      },
    },
  };

  // Load Razorpay script if not already loaded
  if (!(window as unknown as Record<string, unknown>).Razorpay) {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.head.appendChild(script);
    });
  }

  const Razorpay = (window as unknown as Record<string, unknown>).Razorpay as new (opts: Record<string, unknown>) => { open: () => void };
  const rzp = new Razorpay(options);
  rzp.open();
}

export async function buyCoins(userId: string, coins: number, amount: number): Promise<boolean> {
  // Create coin purchase record
  const { data: purchase } = await supabase
    .from('coin_purchases')
    .insert({
      user_id: userId,
      coins,
      amount_paid: amount,
      status: 'pending',
    })
    .select('*')
    .single();

  if (!purchase) return false;

  // Create Razorpay order
  const order = await createRazorpayOrder(amount, 'coins', userId, `Buy ${coins} coins`);
  if (!order) return false;

  // Update purchase with order_id
  await supabase
    .from('coin_purchases')
    .update({ razorpay_order_id: order.order_id })
    .eq('id', purchase.id);

  // Open checkout
  return new Promise((resolve) => {
    openRazorpayCheckout({
      amount,
      orderId: order.order_id,
      keyId: order.key_id,
      name: 'Sangam Coins',
      description: `${coins} Coins`,
      onSuccess: async (paymentId, signature, orderId) => {
        const verified = await verifyRazorpayPayment({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          type: 'coins',
          ref_id: userId,
          amount,
          coins,
        });

        if (verified) {
          await earnCoins(userId, coins, `Bought ${coins} coins`);
          resolve(true);
        } else {
          resolve(false);
        }
      },
      onFailure: () => resolve(false),
    });
  });
}

export async function sendTipWithRazorpay(creatorId: string, amount: number, message?: string): Promise<boolean> {
  const profile = useAuthStore.getState().profile;
  if (!profile) return false;

  const order = await createRazorpayOrder(amount, 'tip', creatorId, `Tip to creator`);
  if (!order) return false;

  return new Promise((resolve) => {
    openRazorpayCheckout({
      amount,
      orderId: order.order_id,
      keyId: order.key_id,
      name: 'Sangam Tip',
      description: 'Send a tip',
      onSuccess: async (paymentId, signature, orderId) => {
        const verified = await verifyRazorpayPayment({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          type: 'tip',
          ref_id: creatorId,
          amount,
        });

        if (verified) {
          await supabase.from('tips').insert({
            creator_id: creatorId,
            tipper_id: profile.id,
            amount,
            currency: 'INR',
            razorpay_payment_id: paymentId,
            message: message || null,
          });
          resolve(true);
        } else {
          resolve(false);
        }
      },
      onFailure: () => resolve(false),
    });
  });
}

export async function sendTipWithCoins(tipperId: string, creatorId: string, coins: number, message?: string): Promise<boolean> {
  const success = await spendCoins(tipperId, coins, `Tipped creator`, creatorId);
  if (!success) return false;

  await supabase.from('tips').insert({
    creator_id: creatorId,
    tipper_id: tipperId,
    amount: 0,
    coins_used: coins,
    currency: 'COINS',
    message: message || null,
  });

  await earnCoins(creatorId, coins, `Received tip`, tipperId);
  return true;
}

export async function boostPost(postId: string, userId: string, coins: number, reach: number, durationHours: number): Promise<boolean> {
  const success = await spendCoins(userId, coins, `Boosted post`, postId);
  if (!success) return false;

  const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  await supabase.from('boosted_posts').insert({
    post_id: postId,
    user_id: userId,
    coins_spent: coins,
    reach_target: reach,
    started_at: new Date().toISOString(),
    ends_at: endsAt,
    status: 'active',
  });

  return true;
}

export async function boostPostWithRazorpay(postId: string, userId: string, amount: number, reach: number, durationHours: number): Promise<boolean> {
  const order = await createRazorpayOrder(amount, 'boost', postId, `Boost post`);
  if (!order) return false;

  return new Promise((resolve) => {
    openRazorpayCheckout({
      amount,
      orderId: order.order_id,
      keyId: order.key_id,
      name: 'Sangam Boost',
      description: 'Boost your post',
      onSuccess: async (paymentId, signature, orderId) => {
        const verified = await verifyRazorpayPayment({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          type: 'boost',
          ref_id: postId,
          amount,
        });

        if (verified) {
          const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
          await supabase.from('boosted_posts').insert({
            post_id: postId,
            user_id: userId,
            amount_paid: amount,
            reach_target: reach,
            started_at: new Date().toISOString(),
            ends_at: endsAt,
            status: 'active',
          });
          resolve(true);
        } else {
          resolve(false);
        }
      },
      onFailure: () => resolve(false),
    });
  });
}

export async function donateToFundraiser(fundraiserId: string, donorId: string, amount: number, isAnonymous: boolean): Promise<boolean> {
  const order = await createRazorpayOrder(amount, 'donation', fundraiserId, `Donation`);
  if (!order) return false;

  return new Promise((resolve) => {
    openRazorpayCheckout({
      amount,
      orderId: order.order_id,
      keyId: order.key_id,
      name: 'Sangam Fundraiser',
      description: 'Donation',
      onSuccess: async (paymentId, signature, orderId) => {
        const verified = await verifyRazorpayPayment({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          type: 'donation',
          ref_id: fundraiserId,
          amount,
        });

        if (verified) {
          await supabase.from('donations').insert({
            fundraiser_id: fundraiserId,
            donor_id: donorId,
            amount,
            is_anonymous: isAnonymous,
            razorpay_payment_id: paymentId,
          });
          resolve(true);
        } else {
          resolve(false);
        }
      },
      onFailure: () => resolve(false),
    });
  });
}

export async function subscribeToCreator(creatorId: string, subscriberId: string, amount: number): Promise<boolean> {
  const order = await createRazorpayOrder(amount, 'subscription', creatorId, `Monthly subscription`);
  if (!order) return false;

  return new Promise((resolve) => {
    openRazorpayCheckout({
      amount,
      orderId: order.order_id,
      keyId: order.key_id,
      name: 'Sangam Subscription',
      description: 'Monthly subscription',
      onSuccess: async (paymentId, signature, orderId) => {
        const verified = await verifyRazorpayPayment({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          type: 'subscription',
          ref_id: creatorId,
          amount,
        });

        if (verified) {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('subscriptions').insert({
            subscriber_id: subscriberId,
            channel_id: creatorId,
            amount,
            status: 'active',
            started_at: new Date().toISOString(),
            expires_at: expiresAt,
            razorpay_subscription_id: paymentId,
          });
          resolve(true);
        } else {
          resolve(false);
        }
      },
      onFailure: () => resolve(false),
    });
  });
}

export async function createMarketplaceOrder(params: {
  buyerId: string;
  sellerId: string;
  listingId: string;
  amount: number;
  deliveryAddress: Record<string, unknown>;
}): Promise<boolean> {
  const platformFee = params.amount * 0.05;
  const netToSeller = params.amount - platformFee;

  const order = await createRazorpayOrder(params.amount, 'marketplace', params.listingId, `Marketplace purchase`);
  if (!order) return false;

  return new Promise((resolve) => {
    openRazorpayCheckout({
      amount: params.amount,
      orderId: order.order_id,
      keyId: order.key_id,
      name: 'Sangam Marketplace',
      description: 'Product purchase',
      onSuccess: async (paymentId, signature, orderId) => {
        const verified = await verifyRazorpayPayment({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          type: 'marketplace',
          ref_id: params.listingId,
          amount: params.amount,
        });

        if (verified) {
          await supabase.from('orders').insert({
            buyer_id: params.buyerId,
            seller_id: params.sellerId,
            listing_id: params.listingId,
            amount: params.amount,
            platform_fee: platformFee,
            net_to_seller: netToSeller,
            status: 'confirmed',
            delivery_address: params.deliveryAddress,
            razorpay_payment_id: paymentId,
          });
          resolve(true);
        } else {
          resolve(false);
        }
      },
      onFailure: () => resolve(false),
    });
  });
}

export async function sendLiveGift(params: {
  senderId: string;
  creatorId: string;
  streamId: string;
  giftType: string;
  coins: number;
}): Promise<boolean> {
  const success = await spendCoins(params.senderId, params.coins, `Sent ${params.giftType} gift`, params.streamId);
  if (!success) return false;

  await supabase.from('live_gifts').insert({
    sender_id: params.senderId,
    creator_id: params.creatorId,
    stream_id: params.streamId,
    gift_type: params.giftType,
    coins_spent: params.coins,
  });

  return true;
}

export async function requestPayout(params: {
  creatorId: string;
  amount: number;
  method: 'bank' | 'upi';
  accountDetails: Record<string, unknown>;
}): Promise<boolean> {
  const token = await getAuthToken();
  const supabaseUrl = await getSupabaseUrl();

  const response = await fetch(`${supabaseUrl}/functions/v1/process-payout-request`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      creator_id: params.creatorId,
      amount: params.amount,
      method: params.method,
      account_details: params.accountDetails,
    }),
  });

  if (!response.ok) return false;
  const data = await response.json();
  return data.success === true;
}

export async function generateReferralCode(userId: string): Promise<string> {
  const code = `SANGAM${userId.slice(0, 6).toUpperCase()}`;
  await supabase.from('referrals').insert({
    referrer_id: userId,
    code,
    status: 'pending',
  });
  return code;
}

export async function getReferralStats(userId: string): Promise<{ total: number; successful: number; coins: number }> {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId);
  if (error || !data) return { total: 0, successful: 0, coins: 0 };

  return {
    total: data.length,
    successful: data.filter((r) => r.status === 'rewarded' || r.status === 'first_payment').length,
    coins: data.reduce((sum, r) => sum + (r.coins_awarded || 0), 0),
  };
}
