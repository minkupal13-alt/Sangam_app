import { useState, useEffect } from 'react';
import {
  X,
  Heart,
  Loader2,
  CheckCircle,
  User,
  IndianRupee,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { donateToFundraiser } from '@/lib/paymentApi';

interface DonateModalProps {
  open: boolean;
  onClose: () => void;
  fundraiserId: string;
  title: string;
  goalAmount: number;
  raisedAmount: number;
}

const PRESET_AMOUNTS = [50, 100, 500, 1000];

export default function DonateModal({
  open,
  onClose,
  fundraiserId,
  title,
  goalAmount,
  raisedAmount,
}: DonateModalProps) {
  const profile = useAuthStore((s) => s.profile);
  const [amount, setAmount] = useState<number | ''>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(100);
      setCustomAmount('');
      setAnonymous(false);
      setSuccess(false);
    }
  }, [open]);

  if (!open) return null;

  const progressPct = goalAmount > 0 ? Math.min(100, Math.round((raisedAmount / goalAmount) * 100)) : 0;
  const finalAmount = customAmount ? parseInt(customAmount, 10) : (amount || 0);

  async function handleDonate() {
    if (!profile || finalAmount < 1) return;
    setProcessing(true);
    try {
      const ok = await donateToFundraiser(fundraiserId, profile.id, finalAmount, anonymous);
      if (ok) {
        setSuccess(true);
      } else {
        alert('Payment failed or was cancelled. Please try again.');
      }
    } catch (err) {
      console.error('donate error', err);
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
              Donation Successful!
            </h3>
            <p className="text-sm text-gray-400 mb-5">
              Thank you for your generous contribution of ₹{finalAmount}. You're making a difference!
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
                  <Heart className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-heading font-bold text-lg text-gray-900 dark:text-white">
                  Donate
                </h3>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center active:scale-90 transition-transform"
              >
                <X className="h-4 w-4 text-gray-500 dark:text-gray-300" />
              </button>
            </div>

            {/* Fundraiser title */}
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3 truncate">
              {title}
            </p>

            {/* Progress bar */}
            <div className="rounded-2xl bg-gray-50 dark:bg-navy-300/50 p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Raised
                </span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {progressPct}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-200 dark:bg-navy-400 overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-sangam-gradient transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  ₹{raisedAmount.toLocaleString()}
                </span>
                <span className="text-gray-400">
                  of ₹{goalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Preset amounts */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    setAmount(amt);
                    setCustomAmount('');
                  }}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    amount === amt && !customAmount
                      ? 'bg-sangam-gradient text-white'
                      : 'bg-gray-100 dark:bg-navy-300 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="relative mb-4">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setAmount('');
                }}
                placeholder="Enter custom amount"
                min={1}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-100 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-400"
              />
            </div>

            {/* Anonymous toggle */}
            <button
              onClick={() => setAnonymous(!anonymous)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-navy-300/50 mb-4"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Donate anonymously
                </span>
              </div>
              <div
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  anonymous ? 'bg-brand-500' : 'bg-gray-300 dark:bg-navy-400'
                }`}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    anonymous ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>

            {/* Donate button */}
            <button
              onClick={handleDonate}
              disabled={finalAmount < 1 || processing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4" />
                  Donate {finalAmount >= 1 ? `₹${finalAmount}` : ''}
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              Secure payment via Razorpay
            </p>
          </>
        )}
      </div>
    </div>
  );
}
