import { useState, useEffect } from 'react';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  TrendingUp,
  Coins,
  UserPlus,
  Link as LinkIcon,
  MessageCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { generateReferralCode, getReferralStats } from '@/lib/paymentApi';

const STEPS = [
  {
    icon: UserPlus,
    title: 'Share Your Code',
    description: 'Send your unique referral link to friends via WhatsApp or any platform.',
  },
  {
    icon: Users,
    title: 'Friend Joins',
    description: 'Your friend signs up on Sangam using your referral link or code.',
  },
  {
    icon: Coins,
    title: 'Both Earn Coins',
    description: 'You get 100 coins when they join, and 500 coins when they make their first payment!',
  },
];

export default function ReferralPage() {
  const profile = useAuthStore((s) => s.profile);
  const [referralCode, setReferralCode] = useState<string>('');
  const [stats, setStats] = useState({ total: 0, successful: 0, coins: 0 });
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generating, setGenerating] = useState(false);

  usePageTitle('Refer & Earn | Sangam');

  useEffect(() => {
    if (profile) {
      loadReferral();
    } else {
      setLoading(false);
    }
  }, [profile]);

  async function loadReferral() {
    if (!profile) return;
    setLoading(true);
    try {
      // Check if user already has a referral code
      const code = `SANGAM${profile.id.slice(0, 6).toUpperCase()}`;
      setReferralCode(code);
      const s = await getReferralStats(profile.id);
      setStats(s);
    } catch (err) {
      console.error('loadReferral error', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!profile || referralCode) return;
    setGenerating(true);
    try {
      const code = await generateReferralCode(profile.id);
      setReferralCode(code);
    } catch (err) {
      console.error('generate error', err);
    } finally {
      setGenerating(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function copyLink() {
    const link = `https://sangam.app/join?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function shareWhatsApp() {
    const link = `https://sangam.app/join?ref=${referralCode}`;
    const text = encodeURIComponent(`Join me on Sangam! 🎉 Use my referral code ${referralCode} to get 100 coins free. ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const referralLink = `sangam.app/join?ref=${referralCode}`;

  const statCards = [
    { label: 'Total Referrals', value: stats.total, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
    { label: 'Successful', value: stats.successful, icon: TrendingUp, color: 'text-coral-500', bg: 'bg-coral-50 dark:bg-coral-900/20' },
    { label: 'Coins Earned', value: stats.coins, icon: Coins, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Gift className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
            Refer & Earn
          </h1>
          <p className="text-xs text-gray-400">Invite friends, earn coins together</p>
        </div>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl bg-sangam-gradient p-6 text-white mb-4 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-4 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-2" />
          <h2 className="font-heading font-bold text-lg mb-1">
            Earn up to 500 coins per friend!
          </h2>
          <p className="text-sm text-white/80">
            Get 100 coins when they join + 500 coins on their first payment
          </p>
        </div>
      </div>

      {/* Referral code display */}
      {!referralCode ? (
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-6 mb-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Generate your unique referral code to start earning
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-full bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Gift className="h-4 w-4" />
                Generate Referral Code
              </>
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Code */}
          <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-5 mb-3">
            <p className="text-xs text-gray-400 mb-2 text-center">Your Referral Code</p>
            <div className="flex items-center justify-center gap-3 mb-3">
              <p className="font-heading font-extrabold text-3xl text-sangam-gradient tracking-wider">
                {referralCode}
              </p>
            </div>
            <button
              onClick={copyCode}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 dark:bg-navy-300 text-gray-700 dark:text-gray-300 text-sm font-bold active:scale-95 transition-transform"
            >
              {copiedCode ? (
                <>
                  <Check className="h-4 w-4 text-brand-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Code
                </>
              )}
            </button>
          </div>

          {/* Referral link */}
          <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-5 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="h-4 w-4 text-gray-400" />
              <p className="text-xs text-gray-400">Referral Link</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-100 dark:border-navy-300">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {referralLink}
                </p>
              </div>
              <button
                onClick={copyLink}
                className="flex-shrink-0 h-10 w-10 rounded-xl bg-gray-100 dark:bg-navy-300 flex items-center justify-center active:scale-90 transition-transform"
              >
                {copiedLink ? (
                  <Check className="h-4 w-4 text-brand-500" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                )}
              </button>
            </div>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={shareWhatsApp}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#25D366] text-white text-sm font-bold active:scale-95 transition-transform"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 dark:bg-navy-300 text-gray-700 dark:text-gray-300 text-sm font-bold active:scale-95 transition-transform"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-brand-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4 text-center"
            >
              <div className={`h-9 w-9 rounded-full ${card.bg} flex items-center justify-center mx-auto mb-2`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
                {card.value.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-5">
        <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-4">
          How It Works
        </h2>
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-coral-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div className="pt-1">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
