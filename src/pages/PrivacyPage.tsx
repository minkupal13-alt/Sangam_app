import { Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/lib/usePageTitle';

export default function PrivacyPage() {
  usePageTitle('Privacy Policy');
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 hover:text-brand-500">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Lock className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white">Privacy Policy</h1>
          <p className="text-sm text-gray-400">Last updated: July 2026</p>
        </div>
      </div>

      <div className="space-y-5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">1. Data We Collect</h2>
          <p>We collect your name, username, email, profile photo, and content you post. Payment data is processed by Razorpay — we do not store card numbers or banking credentials.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">2. How We Use Your Data</h2>
          <p>To provide and improve Sangam features, process payments, send notifications, and prevent abuse. We never sell your data to third parties.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">3. Payment Data</h2>
          <p>All payments are handled by Razorpay under PCI-DSS compliance. Sangam only stores transaction IDs and amounts — never card details or CVV.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">4. Data Sharing</h2>
          <p>We share data only with payment processors (Razorpay), email providers (Resend), and when required by law. Your coin balance and transaction history are visible only to you.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">5. Your Rights</h2>
          <p>You can view, export, or delete your data from Settings at any time. Deleting your account permanently removes your profile and content within 30 days.</p>
        </section>

        <section className="p-4 rounded-2xl bg-white dark:bg-navy-100 border border-gray-100 dark:border-navy-300">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">6. Contact</h2>
          <p>Privacy questions? Email <span className="text-brand-500 font-semibold">privacy@sangam.app</span>.</p>
        </section>
      </div>
    </div>
  );
}
