import { useState, useEffect } from 'react';
import { X, Heart, Coins, CreditCard, Loader2, Check, Sparkles } from 'lucide-react';
import { sendTipWithCoins, sendTipWithRazorpay, getWallet } from '@/lib/paymentApi';
import { fetchMonetization } from '@/lib/monetizationApi';
import { useAuthStore } from '@/lib/authStore';
import type { Profile } from '@/lib/types';

interface TipModalProps {
  creator: Profile;
  open: boolean;
  onClose: () => void;
}

const COIN_PRESETS = [10, 20, 50, 100];
const CASH_PRESETS = [10, 50, 100, 500];

export default function TipModal({ creator, open, onClose }: TipModalProps) {
  const profile = useAuthStore((s) => s.profile);
  const [tab, setTab] = useState<'coins' | 'pay'>('coins');
  const [coinAmount, setCoinAmount] = useState(20);
  const [customCoin, setCustomCoin] = useState('');
  const [cashAmount, setCashAmount] = useState(50);
  const [customCash, setCustomCash] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [coinsBalance, setCoinsBalance] = useState(0);
  const [monetizationEnabled, setMonetizationEnabled] = useState(false);

  useEffect(() => {
    if (open && profile) {
      getWallet(profile.id).then((w) => setCoinsBalance(w?.coins_balance || 0));
      fetchMonetization(creator.id).then((m) => setMonetizationEnabled(!!m?.is_enabled));
    }
  }, [open, profile, creator.id]);

  if (!open) return null;

  if (!monetizationEnabled) return null;

  const finalCoinAmount = customCoin ? parseInt(customCoin) : coinAmount;
  const finalCashAmount = customCash ? parseInt(customCash) : cashAmount;
  const insufficientCoins = tab === 'coins' && finalCoinAmount > coinsBalance;

  async function handleSend() {
    if (!profile) return;
    setSending(true);
    try {
      if (tab === 'coins') {
        if (!finalCoinAmount || finalCoinAmount <= 0 || insufficientCoins) {
          setSending(false);
          return;
        }
        const ok = await sendTipWithCoins(profile.id, creator.id, finalCoinAmount, message.trim() || undefined);
        if (ok) {
          setSuccess(true);
          setCoinsBalance(coinsBalance - finalCoinAmount);
          setTimeout(() => handleClose(), 2000);
        }
      } else {
        if (!finalCashAmount || finalCashAmount <= 0) {
          setSending(false);
          return;
        }
        const ok = await sendTipWithRazorpay(creator.id, finalCashAmount, message.trim() || undefined);
        if (ok) {
          setSuccess(true);
          setTimeout(() => handleClose(), 2000);
        }
      }
    } catch {
      // ignore
    }
    setSending(false);
  }

  function handleClose() {
    onClose();
    setSuccess(false);
    setMessage('');
    setCustomCoin('');
    setCustomCash('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full sm:max-w-sm bg-white dark:bg-navy-100 rounded-t-3xl sm:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        {success ? (
          <div className="flex flex-col items-center py-8">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mb-3 animate-bounce">
              <Heart className="h-8 w-8 text-emerald-500 fill-emerald-500" />
            </div>
            <p className="font-bold text-lg text-gray-900 dark:text-white">Thank you for the tip! 🎉</p>
            <p className="text-sm text-gray-400 mt-1">
              {tab === 'coins' ? `${finalCoinAmount} coins` : `₹${finalCashAmount}`} sent to {creator.full_name}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-sangam-gradient flex items-center justify-center">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-white">Send a Tip</h2>
              </div>
              <button onClick={handleClose} className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4 p-2 rounded-xl bg-gray-50 dark:bg-navy-200">
              <img src={creator.avatar_url || `https://ui-avatars.com/api/?name=${creator.full_name}`} alt="" className="h-10 w-10 rounded-full object-cover" />
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">{creator.full_name}</p>
                <p className="text-xs text-gray-400">@{creator.username}</p>
              </div>
            </div>

            {/* Tab toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTab('coins')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all ${
                  tab === 'coins' ? 'bg-sangam-gradient text-white' : 'bg-gray-100 dark:bg-navy-300 text-gray-500'
                }`}
              >
                <Coins className="h-4 w-4" /> Coins
              </button>
              <button
                onClick={() => setTab('pay')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all ${
                  tab === 'pay' ? 'bg-sangam-gradient text-white' : 'bg-gray-100 dark:bg-navy-300 text-gray-500'
                }`}
              >
                <CreditCard className="h-4 w-4" /> Pay Directly
              </button>
            </div>

            {tab === 'coins' ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Choose coins</p>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Coins className="h-3 w-3" /> Balance: {coinsBalance}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {COIN_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => { setCoinAmount(amt); setCustomCoin(''); }}
                      className={`py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                        !customCoin && coinAmount === amt ? 'bg-sangam-gradient text-white' : 'bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {amt}🪙
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={customCoin}
                  onChange={(e) => setCustomCoin(e.target.value)}
                  placeholder="Custom amount"
                  min="1"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 mb-2"
                />
                {insufficientCoins && (
                  <p className="text-xs text-red-500 font-medium mb-2">Insufficient coins! You have {coinsBalance} coins.</p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Choose amount</p>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {CASH_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => { setCashAmount(amt); setCustomCash(''); }}
                      className={`py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                        !customCash && cashAmount === amt ? 'bg-sangam-gradient text-white' : 'bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={customCash}
                  onChange={(e) => setCustomCash(e.target.value)}
                  placeholder="Custom amount"
                  min="1"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 mb-2"
                />
              </>
            )}

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message (optional)"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 mb-4"
            />

            <button
              onClick={handleSend}
              disabled={sending || (tab === 'coins' && insufficientCoins) || (!finalCoinAmount && !finalCashAmount)}
              className="w-full py-3 rounded-xl bg-sangam-gradient text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Heart className="h-5 w-5" />
                  Send {tab === 'coins' ? `${finalCoinAmount || 0}🪙` : `₹${finalCashAmount || 0}`}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
