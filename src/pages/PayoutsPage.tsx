import { useState, useEffect } from 'react';
import {
  Wallet,
  Heart,
  Users,
  ShoppingBag,
  HandHeart,
  TrendingUp,
  Loader2,
  IndianRupee,
  Building2,
  Smartphone,
  ArrowDownToLine,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { requestPayout } from '@/lib/paymentApi';
import { timeAgo } from '@/lib/format';

interface Earnings {
  tips: number;
  subscriptions: number;
  marketplace: number;
  fundraisers: number;
}

interface Payout {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
}

const PLATFORM_FEE_RATE = 0.1;

const PAYOUT_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'text-amber-500', icon: Clock },
  processing: { label: 'Processing', color: 'text-blue-500', icon: Loader2 },
  completed: { label: 'Completed', color: 'text-brand-500', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-500', icon: XCircle },
};

export default function PayoutsPage() {
  const profile = useAuthStore((s) => s.profile);
  const [earnings, setEarnings] = useState<Earnings>({ tips: 0, subscriptions: 0, marketplace: 0, fundraisers: 0 });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [dailyEarnings, setDailyEarnings] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [method, setMethod] = useState<'bank' | 'upi'>('bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [requesting, setRequesting] = useState(false);

  usePageTitle('Payouts | Sangam');

  useEffect(() => {
    if (profile) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [profile]);

  async function loadData() {
    if (!profile) return;
    setLoading(true);
    try {
      // Fetch tips
      const { data: tips } = await supabase
        .from('tips')
        .select('amount')
        .eq('creator_id', profile.id);
      const tipsTotal = (tips || []).reduce((s, t) => s + (t.amount || 0), 0);

      // Fetch subscriptions
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('amount')
        .eq('channel_id', profile.id)
        .eq('status', 'active');
      const subsTotal = (subs || []).reduce((s, t) => s + (t.amount || 0), 0);

      // Fetch marketplace sales
      const { data: orders } = await supabase
        .from('orders')
        .select('net_to_seller')
        .eq('seller_id', profile.id)
        .in('status', ['completed', 'delivered']);
      const marketTotal = (orders || []).reduce((s, t) => s + (t.net_to_seller || 0), 0);

      // Fetch donations
      const { data: donations } = await supabase
        .from('donations')
        .select('amount, fundraiser:fundraiser_id (creator_id)')
        .eq('fundraiser.creator_id', profile.id);
      const donationsTotal = (donations || []).reduce((s, t) => s + (t.amount || 0), 0);

      setEarnings({
        tips: tipsTotal,
        subscriptions: subsTotal,
        marketplace: marketTotal,
        fundraisers: donationsTotal,
      });

      // Generate 30-day mock earnings chart (based on tips spread)
      const base = Math.max(10, tipsTotal / 30);
      const chart = Array.from({ length: 30 }, (_, i) => {
        const variance = Math.sin(i * 0.5) * 0.4 + Math.random() * 0.3;
        return Math.max(0, Math.round(base * (1 + variance)));
      });
      setDailyEarnings(chart);

      // Fetch payout history
      const { data: payoutData } = await supabase
        .from('payouts')
        .select('*')
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setPayouts((payoutData as unknown as Payout[]) || []);
    } catch (err) {
      console.error('loadPayouts error', err);
    } finally {
      setLoading(false);
    }
  }

  const grossEarnings = earnings.tips + earnings.subscriptions + earnings.marketplace + earnings.fundraisers;
  const platformFee = Math.round(grossEarnings * PLATFORM_FEE_RATE);
  const netAvailable = grossEarnings - platformFee;

  async function handleWithdraw() {
    if (!profile) return;
    const amt = parseInt(withdrawAmount, 10);
    if (!amt || amt < 1) {
      alert('Enter a valid amount');
      return;
    }
    if (amt > netAvailable) {
      alert('Amount exceeds available balance');
      return;
    }
    if (method === 'bank' && (!accountNumber || !ifsc)) {
      alert('Enter account number and IFSC code');
      return;
    }
    if (method === 'upi' && !upiId) {
      alert('Enter your UPI ID');
      return;
    }
    setRequesting(true);
    try {
      const accountDetails = method === 'bank'
        ? { account_number: accountNumber, ifsc }
        : { upi_id: upiId };
      const ok = await requestPayout({
        creatorId: profile.id,
        amount: amt,
        method,
        accountDetails,
      });
      if (ok) {
        alert('Withdrawal request submitted! You\'ll receive it within 3-5 business days.');
        setWithdrawAmount('');
        setAccountNumber('');
        setIfsc('');
        setUpiId('');
        await loadData();
      } else {
        alert('Failed to request withdrawal. Please try again.');
      }
    } catch (err) {
      console.error('withdraw error', err);
      alert('Something went wrong.');
    } finally {
      setRequesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const maxDaily = Math.max(...dailyEarnings, 1);
  const chartHeight = 80;

  const earningCards = [
    { label: 'Tips', amount: earnings.tips, icon: Heart, color: 'text-coral-500', bg: 'bg-coral-50 dark:bg-coral-900/20' },
    { label: 'Subscriptions', amount: earnings.subscriptions, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
    { label: 'Marketplace', amount: earnings.marketplace, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Fundraisers', amount: earnings.fundraisers, icon: HandHeart, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
          Payouts
        </h1>
      </div>

      {/* Net available balance */}
      <div className="rounded-2xl bg-sangam-gradient p-5 text-white mb-4 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">
            Net Available
          </p>
          <p className="font-heading font-extrabold text-4xl mt-1">
            ₹{netAvailable.toLocaleString()}
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs text-white/80">
            <span>Gross: ₹{grossEarnings.toLocaleString()}</span>
            <span>•</span>
            <span>Fee: ₹{platformFee.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Earnings breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {earningCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4"
            >
              <div className={`h-9 w-9 rounded-full ${card.bg} flex items-center justify-center mb-2`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-xs text-gray-400">{card.label}</p>
              <p className="font-bold text-sm text-gray-900 dark:text-white">
                ₹{card.amount.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Fee breakdown */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Gross Earnings</span>
            <span className="font-semibold text-gray-900 dark:text-white">₹{grossEarnings.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Platform Fee (10%)</span>
            <span className="font-semibold text-red-500">- ₹{platformFee.toLocaleString()}</span>
          </div>
          <div className="border-t border-gray-50 dark:border-navy-300/50 pt-2 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900 dark:text-white">Net Available</span>
            <span className="font-bold text-brand-500">₹{netAvailable.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 30-day earnings chart */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-brand-500" />
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">
            30-Day Earnings
          </h2>
        </div>
        <svg viewBox="0 0 300 100" className="w-full" preserveAspectRatio="none" style={{ height: chartHeight }}>
          {dailyEarnings.map((val, i) => {
            const barHeight = (val / maxDaily) * 80;
            const x = (i / 30) * 300;
            const w = 300 / 30 - 2;
            return (
              <rect
                key={i}
                x={x}
                y={90 - barHeight}
                width={Math.max(w, 2)}
                height={barHeight}
                rx={1.5}
                className="fill-brand-400 dark:fill-brand-500"
              />
            );
          })}
        </svg>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Withdraw section */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <ArrowDownToLine className="h-4 w-4 text-brand-500" />
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">
            Withdraw Funds
          </h2>
        </div>

        {/* Amount input */}
        <div className="relative mb-3">
          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Enter amount"
            min={1}
            max={netAvailable}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-100 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-400"
          />
        </div>

        {/* Method select */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setMethod('bank')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              method === 'bank'
                ? 'bg-sangam-gradient text-white'
                : 'bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Bank
          </button>
          <button
            onClick={() => setMethod('upi')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              method === 'upi'
                ? 'bg-sangam-gradient text-white'
                : 'bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            UPI
          </button>
        </div>

        {/* Account details form */}
        {method === 'bank' ? (
          <div className="space-y-2 mb-3">
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Account Number"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-100 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-400"
            />
            <input
              type="text"
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value)}
              placeholder="IFSC Code"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-100 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-400"
            />
          </div>
        ) : (
          <div className="mb-3">
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-100 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-400"
            />
          </div>
        )}

        <button
          onClick={handleWithdraw}
          disabled={requesting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
        >
          {requesting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowDownToLine className="h-4 w-4" />
              Request Withdrawal
            </>
          )}
        </button>
      </div>

      {/* Payout history */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 dark:border-navy-300/50">
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">
            Payout History
          </h2>
        </div>
        {payouts.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            No withdrawal requests yet.
          </p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-navy-300/50">
            {payouts.map((p) => {
              const config = PAYOUT_STATUS_CONFIG[p.status] || PAYOUT_STATUS_CONFIG.pending;
              const Icon = config.icon;
              return (
                <div key={p.id} className="flex items-center gap-3 p-4">
                  <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center flex-shrink-0">
                    <Icon className={`h-4 w-4 ${config.color} ${p.status === 'processing' ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      ₹{p.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {p.method} • {timeAgo(p.created_at)}
                    </p>
                  </div>
                  <span className={`text-xs font-bold ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
