import { useState, useEffect, useRef } from 'react';
import { Gift, Loader2, Coins } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { sendLiveGift, LIVE_GIFTS, getWallet, type Wallet } from '@/lib/paymentApi';

interface GiftTrayProps {
  streamId: string;
  creatorId: string;
  senderId: string;
}

interface FloatingGift {
  id: number;
  emoji: string;
}

export default function GiftTray({ streamId, creatorId, senderId }: GiftTrayProps) {
  const profile = useAuthStore((s) => s.profile);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [floatingGifts, setFloatingGifts] = useState<FloatingGift[]>([]);
  const [error, setError] = useState<string | null>(null);
  const giftIdRef = useRef(0);

  useEffect(() => {
    if (profile) {
      getWallet(profile.id).then(setWallet);
    }
  }, [profile]);

  const balance = wallet?.coins_balance ?? 0;

  async function handleSendGift(giftType: string, coins: number, emoji: string) {
    if (!profile) return;
    if (balance < coins) {
      setError('Not enough coins. Buy more to send this gift!');
      setTimeout(() => setError(null), 2500);
      return;
    }
    setSending(giftType);
    try {
      const ok = await sendLiveGift({
        senderId,
        creatorId,
        streamId,
        giftType,
        coins,
      });
      if (ok) {
        // Deduct locally and show animation
        setWallet((w) => w ? { ...w, coins_balance: w.coins_balance - coins } : w);
        const id = giftIdRef.current++;
        setFloatingGifts((prev) => [...prev, { id, emoji }]);
        setTimeout(() => {
          setFloatingGifts((prev) => prev.filter((g) => g.id !== id));
        }, 3000);
      } else {
        setError('Failed to send gift. Try again.');
        setTimeout(() => setError(null), 2500);
      }
    } catch (err) {
      console.error('sendGift error', err);
      setError('Something went wrong.');
      setTimeout(() => setError(null), 2500);
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="relative">
      {/* Floating gift animations */}
      <div className="pointer-events-none absolute bottom-full left-0 right-0 flex justify-center gap-2 overflow-hidden">
        {floatingGifts.map((g) => (
          <div
            key={g.id}
            className="text-4xl animate-floatUp"
            style={{ animationDelay: '0ms' }}
          >
            {g.emoji}
          </div>
        ))}
      </div>

      {/* Error toast */}
      {error && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 rounded-full bg-red-500 text-white text-xs font-bold whitespace-nowrap animate-fadeIn">
          {error}
        </div>
      )}

      {/* Balance display */}
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Coins className="h-3.5 w-3.5 text-brand-500" />
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
          {balance.toLocaleString()}
        </span>
      </div>

      {/* Gift buttons row */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {LIVE_GIFTS.map((gift) => {
          const canAfford = balance >= gift.coins;
          const isSending = sending === gift.type;
          return (
            <button
              key={gift.type}
              onClick={() => handleSendGift(gift.type, gift.coins, gift.emoji)}
              disabled={isSending || !canAfford}
              className="flex-shrink-0 flex flex-col items-center gap-1 w-16 p-2 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 active:scale-90 transition-transform disabled:opacity-40"
            >
              <div className="relative">
                <span className="text-2xl">{gift.emoji}</span>
                {isSending && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 truncate w-full text-center">
                {gift.name}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-400">
                <Coins className="h-2.5 w-2.5" />
                {gift.coins}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
