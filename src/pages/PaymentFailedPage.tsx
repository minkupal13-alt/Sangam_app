import { useNavigate } from 'react-router-dom';
import { XCircle, RotateCcw, Home } from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';

export default function PaymentFailedPage() {
  const navigate = useNavigate();

  usePageTitle('Payment Failed | Sangam');

  const params = new URLSearchParams(window.location.search);
  const amount = params.get('amount');
  const type = params.get('type');

  const typeLabels: Record<string, string> = {
    coins: 'Coin Purchase',
    tip: 'Creator Tip',
    boost: 'Post Boost',
    donation: 'Fundraiser Donation',
    subscription: 'Creator Subscription',
    marketplace: 'Marketplace Order',
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Red X icon */}
        <div className="flex flex-col items-center mb-6">
          <div className="h-24 w-24 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center animate-pop">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white mt-6 text-center">
            Payment Failed
          </h1>
          <p className="text-sm text-gray-400 mt-1 text-center">
            Your transaction could not be completed. Please try again.
          </p>
        </div>

        {/* Transaction details card */}
        {(amount || type) && (
          <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-5 mb-5">
            <div className="space-y-3">
              {type && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Type</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {typeLabels[type] || type}
                  </span>
                </div>
              )}
              {amount && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Amount</span>
                  <span className="text-sm font-bold text-red-500">
                    ₹{amount}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Status</span>
                <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Failed
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Possible reasons */}
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 p-4 mb-5">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-2">
            Possible reasons:
          </p>
          <ul className="space-y-1 text-xs text-amber-600 dark:text-amber-400">
            <li>• Insufficient funds or payment declined</li>
            <li>• Network connectivity issue</li>
            <li>• Payment cancelled by user</li>
            <li>• Bank server timeout</li>
          </ul>
        </div>

        {/* Try Again button */}
        <button
          onClick={() => navigate(-1)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform mb-3"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 dark:bg-navy-300 text-gray-900 dark:text-white text-sm font-bold active:scale-95 transition-transform"
        >
          <Home className="h-4 w-4" />
          Go to Home
        </button>
      </div>
    </div>
  );
}
