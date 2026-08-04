import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera, Check, Loader2, ChevronRight, ChevronLeft, Sparkles,
  Globe, MapPin, Clock, UserPlus, PartyPopper,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { LANGUAGES, setLanguage } from '@/lib/i18n';
import SangamLogo from '@/components/SangamLogo';
import type { Profile } from '@/lib/types';

const INTERESTS = [
  { emoji: '🎵', label: 'Music' },
  { emoji: '⚽', label: 'Sports' },
  { emoji: '💻', label: 'Tech' },
  { emoji: '✈️', label: 'Travel' },
  { emoji: '🍕', label: 'Food' },
  { emoji: '👗', label: 'Fashion' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '📰', label: 'News' },
  { emoji: '😂', label: 'Comedy' },
  { emoji: '🎨', label: 'Art' },
  { emoji: '💪', label: 'Fitness' },
  { emoji: '🎬', label: 'Movies' },
  { emoji: '💃', label: 'Dance' },
  { emoji: '📚', label: 'Education' },
  { emoji: '💼', label: 'Business' },
  { emoji: '🌿', label: 'Nature' },
  { emoji: '👨‍🍳', label: 'Cooking' },
  { emoji: '📸', label: 'Photography' },
  { emoji: '🐾', label: 'Pets' },
  { emoji: '🔧', label: 'DIY' },
  { emoji: '🏥', label: 'Health' },
  { emoji: '💰', label: 'Finance' },
  { emoji: '🚗', label: 'Cars' },
  { emoji: '📖', label: 'Books' },
];

const ALL_COUNTRIES = [
  'India', 'USA', 'UK', 'UAE', 'Saudi Arabia', 'Pakistan', 'Bangladesh',
  'Sri Lanka', 'Nepal', 'Indonesia', 'Malaysia', 'Singapore', 'Thailand',
  'Vietnam', 'South Korea', 'Japan', 'China', 'Germany', 'France',
  'Italy', 'Spain', 'Russia', 'Brazil', 'Mexico', 'Australia',
  'South Africa', 'Nigeria', 'Kenya', 'Egypt', 'Turkey', 'Netherlands',
  'Sweden', 'Denmark', 'Poland', 'Portugal', 'Switzerland', 'New Zealand',
  'Canada', 'Argentina', 'Philippines', 'Myanmar', 'Cambodia',
];

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Avatar
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Step 2: Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Step 3: Language & Location
  const [selectedLang, setSelectedLang] = useState(i18n.language || 'hi');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [timezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  // Step 4: Follow suggestions
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  // Completion
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!session) navigate('/login');
  }, [session, navigate]);

  // Fetch follow suggestions
  useEffect(() => {
    if (step === 4 && suggestions.length === 0) {
      (async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, followers_count, is_verified')
          .neq('id', session?.user.id || '')
          .order('followers_count', { ascending: false })
          .limit(10);
        if (data) setSuggestions(data as Profile[]);
      })();
    }
  }, [step, suggestions.length, session]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop();
    const path = `${session.user.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (!upErr) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    }
    setUploadingAvatar(false);
  }

  function toggleInterest(label: string) {
    setSelectedInterests((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label],
    );
  }

  async function handleFollow(userId: string) {
    if (!session) return;
    const isFollowing = followingIds.has(userId);
    if (isFollowing) {
      setFollowingIds((prev) => { const next = new Set(prev); next.delete(userId); return next; });
      await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', userId);
      await supabase.rpc('decrement_followers_count', { p_user_id: userId });
      await supabase.rpc('decrement_following_count', { p_user_id: session.user.id });
    } else {
      setFollowingIds((prev) => new Set([...prev, userId]));
      await supabase.from('follows').insert({ follower_id: session.user.id, following_id: userId });
      await supabase.rpc('increment_followers_count', { p_user_id: userId });
      await supabase.rpc('increment_following_count', { p_user_id: session.user.id });
    }
  }

  async function handleFollowAll() {
    if (!session) return;
    const toFollow = suggestions.filter((s) => !followingIds.has(s.id));
    for (const s of toFollow) {
      await handleFollow(s.id);
    }
  }

  async function saveOnboardingData() {
    if (!session) return;
    const updates: Record<string, unknown> = {};
    if (avatarUrl) updates.avatar_url = avatarUrl;
    if (selectedInterests.length > 0) updates.bio = `Interests: ${selectedInterests.join(', ')}`;

    if (Object.keys(updates).length > 0) {
      await supabase.from('profiles').update(updates).eq('id', session.user.id);
    }

    setLanguage(selectedLang);
    await fetchProfile();
  }

  async function handleNext() {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (selectedInterests.length < 3) return;
      setStep(3);
    } else if (step === 3) {
      await saveOnboardingData();
      setStep(4);
    } else if (step === 4) {
      setShowConfetti(true);
      setTimeout(() => {
        navigate('/');
      }, 2500);
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-[#f5f5f4] dark:bg-[#0b1220] transition-colors duration-300">
      {/* Confetti */}
      {showConfetti && <Confetti />}

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-40">
        <div className="h-1 bg-gray-200 dark:bg-navy-300">
          <div
            className="h-full bg-sangam-gradient transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 pt-6">
        <div className="w-full max-w-md">
          {/* Logo + step indicator */}
          <div className="flex flex-col items-center mb-6">
            <SangamLogo size={48} />
            <p className="text-xs text-gray-400 mt-3">
              {t('onboarding.step')} {step} {t('onboarding.of')} {TOTAL_STEPS}
            </p>
          </div>

          {/* Glass card */}
          <div className="bg-white/70 dark:bg-navy-200/70 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-300/20 dark:shadow-black/40 p-6 sm:p-8 border border-white/50 dark:border-navy-300/50 min-h-[400px]">

            {/* Step 1: Avatar */}
            {step === 1 && (
              <div className="animate-stepIn flex flex-col items-center">
                <h2 className="font-heading text-xl font-extrabold text-gray-900 dark:text-white mb-1">
                  {t('onboarding.profileSetup')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {t('onboarding.uploadAvatar')}
                </p>

                <div className="relative mb-4">
                  <div className="h-28 w-28 rounded-full bg-gray-200 dark:bg-navy-300 overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-10 w-10 text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-sangam-gradient flex items-center justify-center cursor-pointer shadow-lg">
                    <Camera className="h-4 w-4 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>
                {uploadingAvatar && <p className="text-xs text-gray-400 mb-2">{t('common.loading')}</p>}
                {avatarUrl && (
                  <p className="text-xs text-brand-500 mb-2 flex items-center gap-1">
                    <Check className="h-3 w-3" /> {t('common.done')}
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Interests */}
            {step === 2 && (
              <div className="animate-stepIn">
                <h2 className="font-heading text-xl font-extrabold text-gray-900 dark:text-white mb-1 text-center">
                  {t('onboarding.interests')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
                  {t('onboarding.interestsMin')}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                  {INTERESTS.map((interest) => {
                    const selected = selectedInterests.includes(interest.label);
                    return (
                      <button
                        key={interest.label}
                        onClick={() => toggleInterest(interest.label)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all active:scale-95 ${
                          selected
                            ? 'bg-brand-50 dark:bg-navy-300 border-brand-500 text-brand-600 dark:text-brand-400'
                            : 'bg-gray-50 dark:bg-navy-300/50 border-gray-200 dark:border-navy-300 text-gray-600 dark:text-gray-400 hover:border-brand-400'
                        }`}
                      >
                        <span className="text-2xl">{interest.emoji}</span>
                        <span className="text-xs font-medium">{interest.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-center text-gray-400">
                  {selectedInterests.length} {t('onboarding.interestsSelected')}
                </p>
              </div>
            )}

            {/* Step 3: Language & Location */}
            {step === 3 && (
              <div className="animate-stepIn">
                <h2 className="font-heading text-xl font-extrabold text-gray-900 dark:text-white mb-1 text-center">
                  {t('onboarding.languageLocation')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
                  {t('onboarding.chooseLanguage')}
                </p>

                {/* Language select */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Globe className="h-4 w-4" /> {t('onboarding.selectLanguage')}
                  </label>
                  <select
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name} ({lang.englishName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Country select */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {t('onboarding.selectCountry')}
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="">—</option>
                    {ALL_COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Timezone */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> {t('onboarding.timezoneAuto')}
                  </label>
                  <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-200 dark:border-navy-300 text-gray-500 dark:text-gray-400 text-sm">
                    {timezone}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Follow suggestions */}
            {step === 4 && (
              <div className="animate-stepIn">
                <h2 className="font-heading text-xl font-extrabold text-gray-900 dark:text-white mb-1 text-center">
                  {t('onboarding.followSuggestions')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
                  {t('onboarding.onboardingComplete')}
                </p>

                {suggestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleFollowAll}
                      className="w-full py-2 mb-3 rounded-xl bg-sangam-gradient text-white text-sm font-semibold active:scale-95 transition-transform"
                    >
                      {t('onboarding.followAll')}
                    </button>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {suggestions.map((user) => {
                        const isFollowing = followingIds.has(user.id);
                        return (
                          <div key={user.id} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-navy-300/50">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-sangam-gradient flex items-center justify-center text-white font-bold text-sm">
                                {user.full_name[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {user.full_name}
                                {user.is_verified && <span className="text-brand-500 ms-1">✓</span>}
                              </p>
                              <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                            </div>
                            <button
                              onClick={() => handleFollow(user.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                isFollowing
                                  ? 'bg-gray-200 dark:bg-navy-400 text-gray-500 dark:text-gray-400'
                                  : 'bg-brand-500 text-white'
                              }`}
                            >
                              {isFollowing ? t('onboarding.following') : t('onboarding.follow')}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Navigation buttons */}
            {!showConfetti && (
              <div className="flex gap-3 mt-6">
                {step > 1 && (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-400 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-navy-400 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> {t('onboarding.back')}
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={loading || (step === 2 && selectedInterests.length < 3)}
                  className="shimmer-btn flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-sangam-gradient text-white font-semibold disabled:opacity-60 active:scale-[0.98] transition-transform shadow-lg shadow-coral-500/20"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {step === 4 ? (
                    <><Sparkles className="h-4 w-4" /> {t('onboarding.getStarted')}</>
                  ) : (
                    <>{t('onboarding.next')} <ChevronRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            )}

            {/* Welcome animation on completion */}
            {showConfetti && (
              <div className="flex flex-col items-center justify-center py-12 animate-welcomePop">
                <PartyPopper className="h-16 w-16 text-coral-500 mb-4" />
                <h2 className="font-heading text-2xl font-extrabold text-gray-900 dark:text-white text-center">
                  {t('onboarding.welcomeToSangam')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                  {t('onboarding.onboardingComplete')}
                </p>
              </div>
            )}

            {/* Skip link */}
            {step < 4 && !showConfetti && (
              <button
                onClick={() => { if (step === 1) setStep(2); else if (step === 2 && selectedInterests.length >= 3) setStep(3); else if (step === 3) handleNext(); }}
                className="w-full text-center text-xs text-gray-400 hover:text-brand-500 transition-colors mt-3"
              >
                {step === 1 ? t('onboarding.skip') : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Confetti component */
function Confetti() {
  const pieces = Array.from({ length: 50 }, (_, i) => {
    const colors = ['#0EA5A4', '#FF6B4A', '#FB923C', '#14B8A6', '#f59e0b', '#ef4444'];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 2 + Math.random() * 1.5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 6 + Math.random() * 8;
    return { id: i, left, delay, duration, color, size };
  });

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            borderRadius: p.id % 2 === 0 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}
