import { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  TrendingUp,
  TrendingDown,
  Coins,
  AlertTriangle,
  X,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingBag,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import {
  getWallet,
  getCoinTransactions,
  buyCoins,
  COIN_PACKAGES,
  type Wallet as WalletType,
  type CoinTransaction,
} from '@/lib/paymentApi';
import { timeAgo } from '@/lib/format';

export default function WalletPage() {
  const profile = useAuthStore((s) => s.profile);
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyOpen, setBuyOpen] = useState(false);
  const [buying, setBuying] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  usePageTitle('Wallet | Sangam');

  useEffect(() => {
    if (profile) {
      loadWallet();
    } else {
      setLoading(false);
    }
  }, [profile, refreshKey]);

  async function loadWallet() {
    if (!profile) return;
    setLoading(true);
    try {
      const [w, txns] = await Promise.all([
        getWallet(profile.id),
        getCoinTransactions(profile.id, 50),
      ]);
      setWallet(w);
      setTransactions(txns);
    } catch (err) {
      console.error('loadWallet error', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuyCoins(coins: number, price: number) {
    if (!profile) return;
    setBuying(coins);
    try {
      const success = await buyCoins(profile.id, coins, price);
      if (success) {
        setBuyOpen(false);
        setRefreshKey((k) => k + 1);
      } else {
        alert('Payment failed or was cancelled. Please try again.');
      }
    } catch (err) {
      console.error('buyCoins error', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setBuying(null);
    }
  }

  const balance = wallet?.coins_balance ?? 0;
  const lowBalance = balance < 50;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
          Wallet
        </h1>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl bg-sangam-gradient p-6 text-white mb-4 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-4 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">
            Coins Balance
          </p>
          <div className="flex items-end gap-2 mt-1">
            <Coins className="h-9 w-9 mb-1" />
            <p className="font-heading font-extrabold text-5xl leading-none">
              {balance.toLocaleString()}
            </p>
          </div>
          <p className="text-white/70 text-sm mt-2">
            ≈ ₹{Math.floor(balance / 10).toLocaleString()} value
          </p>
          <button
            onClick={() => setBuyOpen(true)}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-brand-600 text-sm font-bold active:scale-95 transition-transform"
          >
            <Plus className="h-4 w-4" />
            Buy Coins
          </button>
        </div>
      </div>

      {/* Low balance alert */}
      {lowBalance && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 p-4 mb-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
              Low Balance
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              You have less than 50 coins. Buy more to keep tipping, boosting, and gifting.
            </p>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 dark:border-navy-300/50">
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">
            Transaction History
          </h2>
        </div>
        {transactions.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">
            No transactions yet. Buy coins or start earning!
          </p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-navy-300/50">
            {transactions.map((t) => {
              const isPositive = t.amount >= 0;
              const config =
                t.type === 'earned'
                  ? { icon: ArrowDownToLine, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20', label: 'Earned' }
                  : t.type === 'bought'
                    ? { icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Bought' }
                    : { icon: ArrowUpFromLine, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Spent' };
              const Icon = config.icon;
              return (
                <div key={t.id} className="flex items-center gap-3 p-4">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {t.description || config.label}
                    </p>
                    <p className="text-xs text-gray-400">{timeAgo(t.created_at)}</p>
                  </div>
                  <span className={`text-sm font-bold ${config.color}`}>
                    {isPositive ? '+' : ''}
                    {t.amount}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Buy coins modal */}
      {buyOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl p-5 animate-slideUp max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg text-gray-900 dark:text-white">
                Buy Coins
              </h3>
              <button
                onClick={() => setBuyOpen(false)}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center active:scale-90 transition-transform"
              >
                <X className="h-4 w-4 text-gray-500 dark:text-gray-300" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {COIN_PACKAGES.map((pkg) => (
                <button
                  key={pkg.coins}
                  onClick={() => handleBuyCoins(pkg.coins, pkg.price)}
                  disabled={buying !== null}
                  className="relative rounded-2xl border-2 border-gray-100 dark:border-navy-300 p-4 text-left active:scale-95 transition-all disabled:opacity-50 hover:border-brand-300 dark:hover:border-brand-500"
                >
                  {pkg.discount && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-coral-500 text-white text-[10px] font-bold">
                      {pkg.discount}
                    </span>
                  )}
                  <div className="h-10 w-10 rounded-full bg-sangam-gradient flex items-center justify-center mb-2">
                    <Coins className="h-5 w-5 text-white" />
                  </div>
                  <p className="font-heading font-extrabold text-lg text-gray-900 dark:text-white">
                    {pkg.coins.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">coins</p>
                  <p className="font-bold text-brand-600 dark:text-brand-400 mt-2">
                    ₹{pkg.price}
                  </p>
                  {buying === pkg.coins && (
                    <div className="absolute inset-0 rounded-2xl bg-white/70 dark:bg-navy-200/70 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">
              Secure payment via Razorpay • Instant coin delivery
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
