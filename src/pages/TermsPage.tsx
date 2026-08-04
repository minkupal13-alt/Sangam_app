import { FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/lib/usePageTitle';

export default function TermsPage() {
  usePageTitle('Terms of Service');
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 hover:text-brand-500">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white">Terms of Service</h1>
          <p className="text-sm text-gray-400">Last updated: July 2026</p>
        </div>
      </div>

      <div className="space-y-5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">1. Acceptance of Terms</h2>
          <p>By using Sangam, you agree to these terms. If you do not agree, please discontinue use of the platform.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">2. User Accounts</h2>
          <p>You must be at least 13 years old to use Sangam. You are responsible for maintaining the security of your account and for all activities under your account.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">3. Payment Terms</h2>
          <p>All payments are processed through Razorpay. Sangam does not store card details. Prices are listed in Indian Rupees (INR). Platform fees: 5% on marketplace sales, 2% on fundraisers, 30% on live gift coin value retained by platform.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">4. Creator Monetization</h2>
          <p>Creators can enable tips, subscriptions, and marketplace sales. Earnings are subject to a platform fee and TDS deduction (10% above ₹10,000 annually). Payouts require a minimum balance of ₹100.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">5. Content Guidelines</h2>
          <p>You retain ownership of your content. You grant Sangam a license to display it. Prohibited content includes: illegal material, hate speech, harassment, copyright infringement, and spam.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">6. Termination</h2>
          <p>Sangam may suspend or terminate accounts that violate these terms. You may delete your account at any time from Settings.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">7. Contact</h2>
          <p>Questions? Email <span className="text-brand-500 font-semibold">support@sangam.app</span>.</p>
        </section>
      </div>
    </div>
  );
}
