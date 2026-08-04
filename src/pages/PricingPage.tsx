import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Coins,
  Crown,
  Check,
  Star,
  ChevronDown,
  Sparkles,
  Zap,
  Heart,
  Users,
} from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';
import { COIN_PACKAGES } from '@/lib/paymentApi';

const CREATOR_PLANS = [
  {
    name: 'Basic',
    price: 99,
    icon: Sparkles,
    color: 'from-brand-400 to-brand-600',
    features: [
      'HD streaming up to 720p',
      'Basic analytics dashboard',
      'Coin tipping enabled',
      '5 boosted posts per month',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    price: 299,
    icon: Zap,
    color: 'from-coral-400 to-coral-600',
    popular: true,
    features: [
      'Full HD streaming up to 1080p',
      'Advanced analytics & insights',
      'Custom tip goals & fundraisers',
      'Unlimited boosted posts',
      'Priority email support',
      'Subscriber-only content',
      'Live gift tray unlocked',
    ],
  },
  {
    name: 'Elite',
    price: 999,
    icon: Crown,
    color: 'from-amber-400 to-amber-600',
    features: [
      '4K streaming capability',
      'Full analytics suite + exports',
      'Multi-stream to 3 platforms',
      'Dedicated account manager',
      '24/7 priority support',
      'Exclusive Elite badge',
      'Lower platform fees (5%)',
      'Early access to new features',
    ],
  },
];

const FAQS = [
  {
    q: 'How do coins work?',
    a: 'Coins are Sangam\'s virtual currency. Buy them with INR and use them to tip creators, boost posts, send live gifts, and support fundraisers. 1 coin ≈ ₹0.10.',
  },
  {
    q: 'Can I get a refund on coins?',
    a: 'Coin purchases are non-refundable once completed. However, if a payment fails or you\'re charged incorrectly, contact support within 7 days for assistance.',
  },
  {
    q: 'How are creator payouts calculated?',
    a: 'Creators earn from tips, subscriptions, marketplace sales, and fundraisers. Sangam deducts a 10% platform fee (5% for Elite plan). The net amount is available for withdrawal via bank transfer or UPI.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'We support all major payment methods through Razorpay: UPI, credit/debit cards, net banking, wallets, and EMI. International cards are also accepted.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes! You can cancel your creator subscription at any time from Settings. You\'ll keep access to premium features until the end of your billing period.',
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  usePageTitle('Pricing | Sangam');

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Coins className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
            Pricing & Plans
          </h1>
          <p className="text-xs text-gray-400">Choose what works for you</p>
        </div>
      </div>

      {/* Coin packages comparison */}
      <section className="mb-8">
        <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-white mb-1">
          Coin Packages
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Buy coins to tip, boost, and gift across Sangam
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COIN_PACKAGES.map((pkg) => {
            const isPopular = pkg.coins === 1000;
            return (
              <div
                key={pkg.coins}
                className={`relative rounded-2xl border-2 p-4 text-center transition-all ${
                  isPopular
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-100 dark:border-navy-300 bg-white dark:bg-navy-200'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-sangam-gradient text-white text-[10px] font-bold flex items-center gap-1 whitespace-nowrap">
                    <Star className="h-2.5 w-2.5" />
                    Most Popular
                  </span>
                )}
                {pkg.discount && (
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-coral-500 text-white text-[10px] font-bold">
                    {pkg.discount}
                  </span>
                )}
                <div className="h-10 w-10 rounded-full bg-sangam-gradient mx-auto flex items-center justify-center mb-2">
                  <Coins className="h-5 w-5 text-white" />
                </div>
                <p className="font-heading font-extrabold text-lg text-gray-900 dark:text-white">
                  {pkg.coins.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">coins</p>
                <p className="font-bold text-brand-600 dark:text-brand-400 mt-2">
                  ₹{pkg.price}
                </p>
                {pkg.discount && (
                  <p className="text-[10px] text-gray-400 mt-1 line-through">
                    ₹{Math.round((pkg.coins / 100) * 10)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Creator subscription plans */}
      <section className="mb-8">
        <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-white mb-1">
          Creator Plans
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Unlock powerful tools to grow your audience
        </p>
        <div className="space-y-3">
          {CREATOR_PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border-2 p-5 transition-all ${
                  plan.popular
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-100 dark:border-navy-300 bg-white dark:bg-navy-200'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-sangam-gradient text-white text-[10px] font-bold flex items-center gap-1 whitespace-nowrap">
                    <Star className="h-2.5 w-2.5" />
                    Most Popular
                  </span>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-base text-gray-900 dark:text-white">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-gray-400">per month</p>
                    </div>
                  </div>
                  <p className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white">
                    ₹{plan.price}
                  </p>
                </div>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="h-4 w-4 text-brand-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/setup')}
                  className={`w-full py-2.5 rounded-full text-sm font-bold active:scale-95 transition-transform ${
                    plan.popular
                      ? 'bg-sangam-gradient text-white'
                      : 'bg-gray-100 dark:bg-navy-300 text-gray-900 dark:text-white'
                  }`}
                >
                  Get Started
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-8">
        <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-white mb-4">
          Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="text-sm font-semibold text-gray-900 dark:text-white pr-2">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${
                    openFaq === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-gray-500 dark:text-gray-400">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="rounded-2xl bg-sangam-gradient p-6 text-white text-center mb-4">
        <Users className="h-8 w-8 mx-auto mb-2" />
        <h3 className="font-heading font-bold text-lg mb-1">
          Ready to get started?
        </h3>
        <p className="text-sm text-white/80 mb-4">
          Join thousands of creators earning on Sangam
        </p>
        <button
          onClick={() => navigate('/setup')}
          className="px-6 py-2.5 rounded-full bg-white text-brand-600 text-sm font-bold active:scale-95 transition-transform"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
