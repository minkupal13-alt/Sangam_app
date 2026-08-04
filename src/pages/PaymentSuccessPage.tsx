import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home, Receipt } from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();

  usePageTitle('Payment Successful | Sangam');

  // Try to read transaction details from query params or location state
  const params = new URLSearchParams(window.location.search);
  const amount = params.get('amount');
  const type = params.get('type');
  const paymentId = params.get('payment_id');
  const orderId = params.get('order_id');

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
        {/* Animated checkmark */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center animate-pop">
              <CheckCircle className="h-16 w-16 text-brand-500" />
            </div>
            <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white mt-6 text-center">
            Payment Successful!
          </h1>
          <p className="text-sm text-gray-400 mt-1 text-center">
            Your transaction was completed successfully
          </p>
        </div>

        {/* Transaction details card */}
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-5 mb-5">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-50 dark:border-navy-300/50">
            <div className="h-9 w-9 rounded-full bg-sangam-gradient flex items-center justify-center">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">
              Transaction Details
            </h2>
          </div>
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
                <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                  ₹{amount}
                </span>
              </div>
            )}
            {paymentId && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Payment ID</span>
                <span className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate max-w-[60%]">
                  {paymentId}
                </span>
              </div>
            )}
            {orderId && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Order ID</span>
                <span className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate max-w-[60%]">
                  {orderId}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Date</span>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {new Date().toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Status</span>
              <span className="text-xs font-bold text-brand-500 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Success
              </span>
            </div>
          </div>
        </div>

        {/* Go to Home button */}
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform"
        >
          <Home className="h-4 w-4" />
          Go to Home
        </button>
      </div>
    </div>
  );
}
