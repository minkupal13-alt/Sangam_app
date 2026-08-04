import { useState, useEffect } from 'react';
import {
  X,
  Rocket,
  Coins,
  CreditCard,
  Loader2,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import {
  boostPost,
  boostPostWithRazorpay,
  BOOST_OPTIONS,
  getWallet,
  type Wallet,
} from '@/lib/paymentApi';

interface BoostPostModalProps {
  open: boolean;
  onClose: () => void;
  postId: string;
}

type Tab = 'coins' | 'pay';

export default function BoostPostModal({ open, onClose, postId }: BoostPostModalProps) {
  const profile = useAuthStore((s) => s.profile);
  const [tab, setTab] = useState<Tab>('coins');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open && profile) {
      getWallet(profile.id).then(setWallet);
      setTab('coins');
      setSelected(null);
      setSuccess(false);
    }
  }, [open, profile]);

  if (!open) return null;

  const balance = wallet?.coins_balance ?? 0;

  async function handleBoost() {
    if (!profile || selected === null) return;
    const option = BOOST_OPTIONS[selected];
    setProcessing(true);
    try {
      let ok = false;
      if (tab === 'coins') {
        ok = await boostPost(postId, profile.id, option.coins, option.reach, 24);
      } else {
        ok = await boostPostWithRazorpay(postId, profile.id, option.price, option.reach, 24);
      }
      if (ok) {
        setSuccess(true);
      } else {
        alert(tab === 'coins' ? 'Not enough coins. Buy more or switch to Pay Directly.' : 'Payment failed or was cancelled.');
      }
    } catch (err) {
      console.error('boost error', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fadeIn">
      <div className="w-full sm:max-w-md bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl p-5 animate-slideUp max-h-[85vh] overflow-y-auto">
        {success ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="text-6xl mb-3 animate-pop">🎉</div>
            <CheckCircle className="h-12 w-12 text-brand-500 mb-3" />
            <h3 className="font-heading font-bold text-lg text-gray-900 dark:text-white mb-1">
              Post Boosted!
            </h3>
            <p className="text-sm text-gray-400 mb-5">
              Your post is now reaching more people. Watch the engagement roll in!
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-2xl bg-sangam-gradient flex items-center justify-center">
                  <Rocket className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-heading font-bold text-lg text-gray-900 dark:text-white">
                  Boost Post
                </h3>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center active:scale-90 transition-transform"
              >
                <X className="h-4 w-4 text-gray-500 dark:text-gray-300" />
              </button>
            </div>

            {/* Tab toggle */}
            <div className="flex gap-2 mb-4 p-1 rounded-full bg-gray-100 dark:bg-navy-300">
              <button
                onClick={() => setTab('coins')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-bold transition-all ${
                  tab === 'coins'
                    ? 'bg-white dark:bg-navy-400 text-brand-600 dark:text-brand-400 shadow'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Coins className="h-4 w-4" />
                Use Coins
              </button>
              <button
                onClick={() => setTab('pay')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-bold transition-all ${
                  tab === 'pay'
                    ? 'bg-white dark:bg-navy-400 text-brand-600 dark:text-brand-400 shadow'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Pay Directly
              </button>
            </div>

            {/* Balance display for coins tab */}
            {tab === 'coins' && (
              <div className="rounded-2xl bg-brand-50 dark:bg-brand-900/20 p-3 mb-4 flex items-center gap-2">
                <Coins className="h-5 w-5 text-brand-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Balance: <span className="font-bold text-brand-600 dark:text-brand-400">{balance.toLocaleString()}</span> coins
                </span>
              </div>
            )}

            {/* Boost options */}
            <div className="space-y-3 mb-5">
              {BOOST_OPTIONS.map((opt, i) => {
                const isSelected = selected === i;
                const canAfford = tab === 'pay' || balance >= opt.coins;
                return (
                  <button
                    key={i}
                    onClick={() => canAfford && setSelected(i)}
                    disabled={!canAfford}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition-all disabled:opacity-50 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-gray-100 dark:border-navy-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-sangam-gradient flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-white">
                            {opt.reach.toLocaleString()} reach
                          </p>
                          <p className="text-xs text-gray-400">{opt.duration} duration</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {tab === 'coins' ? (
                          <p className="font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                            <Coins className="h-3.5 w-3.5" />
                            {opt.coins}
                          </p>
                        ) : (
                          <p className="font-bold text-brand-600 dark:text-brand-400">
                            ₹{opt.price}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1 text-xs text-brand-500 font-semibold">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Boost button */}
            <button
              onClick={handleBoost}
              disabled={selected === null || processing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  {selected !== null
                    ? tab === 'coins'
                      ? `Boost for ${BOOST_OPTIONS[selected].coins} coins`
                      : `Boost for ₹${BOOST_OPTIONS[selected].price}`
                    : 'Select an option'}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
