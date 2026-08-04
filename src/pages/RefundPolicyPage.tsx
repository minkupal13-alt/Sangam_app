import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/lib/usePageTitle';

export default function RefundPolicyPage() {
  usePageTitle('Refund Policy');
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 hover:text-brand-500">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white">Refund Policy</h1>
          <p className="text-sm text-gray-400">Last updated: July 2026</p>
        </div>
      </div>

      <div className="space-y-5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">Sangam Coins</h2>
          <p>Coin purchases are non-refundable once the payment is verified and coins are credited to your wallet. If coins were not credited due to a technical error, contact support within 7 days with your transaction ID for investigation.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">Creator Subscriptions</h2>
          <p>Subscription fees are non-refundable. You can cancel at any time from your Subscriptions page, and access continues until the end of the current billing period.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">Tips & Donations</h2>
          <p>Tips and fundraiser donations are voluntary and non-refundable. If a payment failed but you were charged, contact support with your payment ID.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">Marketplace Orders</h2>
          <p>Buyers can request a refund within 3 days of delivery if the item is significantly not as described. Funds are held in escrow and released to the seller only after the 3-day window passes without dispute.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">Post Boosts</h2>
          <p>Boost payments are non-refundable once the boost period has started. If a boost was not activated due to a platform error, contact support for a credit or refund.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">How to Request a Refund</h2>
          <p>Email <span className="text-brand-500 font-semibold">support@sangam.app</span> with your transaction ID, payment method, and reason. Refunds are processed within 5–7 business days to the original payment method.</p>
        </section>
      </div>
    </div>
  );
}
