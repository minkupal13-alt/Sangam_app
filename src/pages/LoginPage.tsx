import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Mail, Lock, Eye, EyeOff, Loader2, Phone, Check, X, ChevronDown,
  Sun, Moon, Globe, Sparkles, Users, Play, TrendingUp, MessageCircle,
  AlertCircle, KeyRound, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { useThemeStore } from '@/lib/themeStore';
import { LANGUAGES, setLanguage } from '@/lib/i18n';
import SangamLogo from '@/components/SangamLogo';

type Tab = 'email' | 'phone' | 'social';

const COUNTRIES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+960', flag: '🇲🇻', name: 'Maldives' },
  { code: '+968', flag: '🇴🇲', name: 'Oman' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain' },
  { code: '+62', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+66', flag: '🇹🇭', name: 'Thailand' },
  { code: '+84', flag: '🇻🇳', name: 'Vietnam' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+39', flag: '🇮🇹', name: 'Italy' },
  { code: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: '+7', flag: '🇷🇺', name: 'Russia' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil' },
  { code: '+52', flag: '🇲🇽', name: 'Mexico' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+20', flag: '🇪🇬', name: 'Egypt' },
  { code: '+212', flag: '🇲🇦', name: 'Morocco' },
  { code: '+90', flag: '🇹🇷', name: 'Turkey' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+46', flag: '🇸🇪', name: 'Sweden' },
  { code: '+47', flag: '🇳🇴', name: 'Norway' },
  { code: '+45', flag: '🇩🇰', name: 'Denmark' },
  { code: '+358', flag: '🇫🇮', name: 'Finland' },
  { code: '+48', flag: '🇵🇱', name: 'Poland' },
  { code: '+30', flag: '🇬🇷', name: 'Greece' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+41', flag: '🇨🇭', name: 'Switzerland' },
  { code: '+43', flag: '🇦🇹', name: 'Austria' },
  { code: '+32', flag: '🇧🇪', name: 'Belgium' },
  { code: '+353', flag: '🇮🇪', name: 'Ireland' },
  { code: '+64', flag: '🇳🇿', name: 'New Zealand' },
];

const FEATURES = [
  { icon: Sparkles, key: 'feature1Title', descKey: 'feature1Desc' },
  { icon: Play, key: 'feature2Title', descKey: 'feature2Desc' },
  { icon: TrendingUp, key: 'feature3Title', descKey: 'feature3Desc' },
  { icon: MessageCircle, key: 'feature4Title', descKey: 'feature4Desc' },
];

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 60 * 1000;

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const session = useAuthStore((s) => s.session);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const [tab, setTab] = useState<Tab>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Phone state
  const [countryCode, setCountryCode] = useState('+91');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Rate limiting
  const [failedAttempts, setFailedAttempts] = useState(() => {
    const stored = localStorage.getItem('sangam_login_attempts');
    if (!stored) return 0;
    const parsed = JSON.parse(stored);
    if (parsed.lockedUntil && Date.now() < parsed.lockedUntil) return MAX_ATTEMPTS;
    if (parsed.lockedUntil && Date.now() >= parsed.lockedUntil) {
      localStorage.removeItem('sangam_login_attempts');
      return 0;
    }
    return parsed.count || 0;
  });

  const isLocked = failedAttempts >= MAX_ATTEMPTS;
  const sessionExpired = searchParams.get('expired') === '1';

  // Redirect if already logged in
  useEffect(() => {
    if (session) navigate('/');
  }, [session, navigate]);

  // Fetch real user count
  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (count !== null) setUserCount(count);
    })();
  }, []);

  // Resend timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-lang-dropdown]')) setShowLangMenu(false);
      if (!target.closest('[data-country-dropdown]')) setShowCountryDropdown(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  function recordFailedAttempt() {
    const next = failedAttempts + 1;
    if (next >= MAX_ATTEMPTS) {
      localStorage.setItem('sangam_login_attempts', JSON.stringify({
        count: next,
        lockedUntil: Date.now() + LOCKOUT_MS,
      }));
      setFailedAttempts(next);
    } else {
      localStorage.setItem('sangam_login_attempts', JSON.stringify({ count: next }));
      setFailedAttempts(next);
    }
  }

  function checkPasswordStrength(pw: string) {
    return {
      length: pw.length >= 8,
      upper: /[A-Z]/.test(pw),
      number: /[0-9]/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw),
    };
  }

  const pwStrength = checkPasswordStrength(password);
  const strengthScore = Object.values(pwStrength).filter(Boolean).length;

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (isLocked) {
      setError(t('login.tooManyAttempts'));
      triggerShake();
      return;
    }

    if (!email || !password) {
      setError(t('login.invalidCredentials'));
      triggerShake();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('login.invalidCredentials'));
      triggerShake();
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      recordFailedAttempt();
      setError(t('login.invalidCredentials'));
      triggerShake();
      return;
    }

    localStorage.removeItem('sangam_login_attempts');
    await fetchProfile();
    navigate('/');
  }

  async function handleSendOtp() {
    setError('');

    if (!phone || phone.length < 7) {
      setError(t('login.enterPhone'));
      triggerShake();
      return;
    }

    setLoading(true);
    const fullPhone = `${countryCode}${phone}`;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
      options: { shouldCreateUser: false },
    });
    setLoading(false);

    if (otpError) {
      if (otpError.message.includes('not confirmed') || otpError.message.includes('not found')) {
        setError(t('login.phoneRegistered'));
      } else {
        setError(otpError.message);
      }
      triggerShake();
      return;
    }

    setOtpSent(true);
    setOtpAttempts(0);
    setResendTimer(30);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }

  async function handleVerifyOtp() {
    setError('');

    if (otpAttempts >= 3) {
      setError(t('login.tooManyAttempts'));
      triggerShake();
      return;
    }

    const code = otp.join('');
    if (code.length !== 6) {
      setError(t('login.enterOtp'));
      triggerShake();
      return;
    }

    const fullPhone = `${countryCode}${phone}`;
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: code,
      type: 'sms',
    });
    setLoading(false);

    if (verifyError) {
      setOtpAttempts((a) => a + 1);
      setError(t('login.otpExpired'));
      triggerShake();
      return;
    }

    localStorage.removeItem('sangam_login_attempts');
    await fetchProfile();
    navigate('/');
  }

  function handleOtpChange(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const next = pasted.split('').concat(Array(6 - pasted.length).fill(''));
      setOtp(next as string[]);
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  }

  async function handleSocialLogin(provider: 'google' | 'facebook' | 'apple') {
    setError('');
    setLoading(true);
    const { error: socialError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (socialError) {
      setLoading(false);
      setError(socialError.message);
      triggerShake();
    }
  }

  function handleLanguageChange(lang: string) {
    setLanguage(lang);
    setShowLangMenu(false);
  }

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  return (
    <div className="min-h-screen flex bg-[#f5f5f4] dark:bg-[#0b1220] transition-colors duration-300" dir={currentLang.dir}>
      {/* Floating gradient orbs background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb-1 absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-brand-500/20 dark:bg-brand-500/10 blur-[80px]" />
        <div className="orb-2 absolute bottom-[-10%] right-[-5%] w-[350px] h-[350px] rounded-full bg-coral-500/20 dark:bg-coral-500/10 blur-[80px]" />
        <div className="orb-3 absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-teal-400/15 dark:bg-teal-400/5 blur-[60px]" />
      </div>

      {/* Left side - desktop only */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 xl:px-24 relative z-10">
        <LeftPanel t={t} userCount={userCount} />
      </div>

      {/* Right side - login form */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 sm:p-6">
          {/* Logo on mobile */}
          <div className="lg:hidden flex items-center gap-2">
            <SangamLogo size={32} />
            <span className="font-heading text-lg font-extrabold text-gray-900 dark:text-white">Sangam</span>
          </div>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-2">
            {/* Language selector */}
            <div className="relative" data-lang-dropdown>
              <button
                onClick={() => setShowLangMenu((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/60 dark:bg-navy-200/60 backdrop-blur-md border border-gray-200/50 dark:border-navy-300/50 text-sm text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-navy-200 transition-colors"
                aria-label={t('login.selectLanguage')}
              >
                <Globe className="h-4 w-4" />
                <span>{currentLang.flag}</span>
                <span className="hidden sm:inline">{currentLang.name}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-56 max-h-80 overflow-y-auto rounded-2xl bg-white dark:bg-navy-200 shadow-xl border border-gray-100 dark:border-navy-300 py-2 animate-scaleIn z-50">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-start ${
                        i18n.language === lang.code
                          ? 'bg-brand-50 dark:bg-navy-300 text-brand-600 dark:text-brand-400 font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300'
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.name}</span>
                      <span className="text-xs text-gray-400 ms-auto">{lang.englishName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/60 dark:bg-navy-200/60 backdrop-blur-md border border-gray-200/50 dark:border-navy-300/50 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-navy-200 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Login card */}
        <div className="flex-1 flex items-center justify-center px-4 pb-8">
          <div className={`w-full max-w-md ${shake ? 'animate-shake' : ''}`}>
            {/* Session expired banner */}
            {sessionExpired && (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm animate-fadeIn">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {t('login.sessionExpired')}
              </div>
            )}

            {/* Glass card */}
            <div className="bg-white/70 dark:bg-navy-200/70 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-300/20 dark:shadow-black/40 p-6 sm:p-8 border border-white/50 dark:border-navy-300/50">
              {/* Header */}
              <div className="hidden lg:flex flex-col items-center mb-6">
                <SangamLogo size={56} />
              </div>

              <h1 className="font-heading text-2xl font-extrabold text-gray-900 dark:text-white text-center mb-1">
                {t('login.welcomeBack')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
                {t('login.signInToAccount')}
              </p>

              {/* Tab switcher */}
              <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-navy-300/50 mb-6">
                {(['email', 'phone', 'social'] as Tab[]).map((tabKey) => (
                  <button
                    key={tabKey}
                    onClick={() => { setTab(tabKey); setError(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      tab === tabKey
                        ? 'bg-white dark:bg-navy-200 text-brand-600 dark:text-brand-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {t(`login.${tabKey}Tab`)}
                  </button>
                ))}
              </div>

              {/* Email tab */}
              {tab === 'email' && (
                <form onSubmit={handleEmailLogin} className="space-y-4 animate-fadeIn">
                  {/* Email input with floating label */}
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder=" "
                      aria-label={t('login.email')}
                      className="peer w-full pl-10 pr-4 pt-5 pb-1.5 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-transparent outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                    <label className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-400 text-sm transition-all peer-focus:top-2 peer-focus:text-xs peer-focus:text-brand-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs">
                      {t('login.email')}
                    </label>
                  </div>

                  {/* Password input */}
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder=" "
                      aria-label={t('login.password')}
                      className="peer w-full pl-10 pr-10 pt-5 pb-1.5 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-transparent outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                    <label className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-400 text-sm transition-all peer-focus:top-2 peer-focus:text-xs peer-focus:text-brand-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs">
                      {t('login.password')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label={showPw ? t('login.hidePassword') : t('login.showPassword')}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password strength (for signup context) */}
                  {password.length > 0 && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i < strengthScore
                                ? strengthScore <= 1 ? 'bg-coral-500' : strengthScore <= 2 ? 'bg-amber-500' : 'bg-brand-500'
                                : 'bg-gray-200 dark:bg-navy-400'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`flex items-center gap-1 ${pwStrength.length ? 'text-brand-500' : 'text-gray-400'}`}>
                          {pwStrength.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} 8+
                        </span>
                        <span className={`flex items-center gap-1 ${pwStrength.upper ? 'text-brand-500' : 'text-gray-400'}`}>
                          {pwStrength.upper ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} A-Z
                        </span>
                        <span className={`flex items-center gap-1 ${pwStrength.number ? 'text-brand-500' : 'text-gray-400'}`}>
                          {pwStrength.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} 0-9
                        </span>
                        <span className={`flex items-center gap-1 ${pwStrength.special ? 'text-brand-500' : 'text-gray-400'}`}>
                          {pwStrength.special ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} @#$%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Forgot password */}
                  <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-xs text-gray-500 hover:text-brand-500 transition-colors">
                      {t('login.forgotPassword')}
                    </Link>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-coral-50 dark:bg-coral-500/10 border border-coral-200 dark:border-coral-500/20 text-coral-600 dark:text-coral-400 text-sm animate-fadeIn">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading || isLocked}
                    className="shimmer-btn w-full py-3 rounded-xl bg-sangam-gradient text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform shadow-lg shadow-coral-500/20"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {t('login.signIn')}
                  </button>
                </form>
              )}

              {/* Phone tab */}
              {tab === 'phone' && (
                <div className="space-y-4 animate-fadeIn">
                  {!otpSent ? (
                    <>
                      {/* Country code + phone */}
                      <div className="flex gap-2">
                        <div className="relative" data-country-dropdown>
                          <button
                            onClick={() => setShowCountryDropdown((v) => !v)}
                            className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white text-sm font-medium hover:border-brand-500 transition-colors min-w-[80px]"
                            aria-label={t('login.selectCountry')}
                          >
                            <span className="text-lg">{COUNTRIES.find((c) => c.code === countryCode)?.flag}</span>
                            <span className="text-sm">{countryCode}</span>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          {showCountryDropdown && (
                            <div className="absolute top-full mt-1 w-64 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-navy-200 shadow-xl border border-gray-100 dark:border-navy-300 py-1 z-50 animate-scaleIn">
                              {COUNTRIES.map((c) => (
                                <button
                                  key={c.code}
                                  onClick={() => { setCountryCode(c.code); setShowCountryDropdown(false); }}
                                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-start transition-colors ${
                                    countryCode === c.code
                                      ? 'bg-brand-50 dark:bg-navy-300 text-brand-600 dark:text-brand-400 font-semibold'
                                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300'
                                  }`}
                                >
                                  <span className="text-lg">{c.flag}</span>
                                  <span>{c.name}</span>
                                  <span className="text-xs text-gray-400 ms-auto">{c.code}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder={t('login.enterPhone')}
                            aria-label={t('login.phone')}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-coral-50 dark:bg-coral-500/10 border border-coral-200 dark:border-coral-500/20 text-coral-600 dark:text-coral-400 text-sm animate-fadeIn">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          {error}
                        </div>
                      )}

                      <button
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="shimmer-btn w-full py-3 rounded-xl bg-sangam-gradient text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform shadow-lg shadow-coral-500/20"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        {t('login.sendOtp')}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        {t('login.otpSent')} {countryCode}{phone}
                      </p>

                      {/* OTP inputs */}
                      <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                        {otp.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => { otpRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            aria-label={`OTP digit ${idx + 1}`}
                            className="w-11 h-12 rounded-xl bg-gray-50 dark:bg-navy-300/50 border border-gray-200 dark:border-navy-300 text-center text-lg font-bold text-gray-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                          />
                        ))}
                      </div>

                      {error && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-coral-50 dark:bg-coral-500/10 border border-coral-200 dark:border-coral-500/20 text-coral-600 dark:text-coral-400 text-sm animate-fadeIn">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          {error}
                        </div>
                      )}

                      {/* Resend timer */}
                      <div className="text-center text-sm">
                        {resendTimer > 0 ? (
                          <span className="text-gray-400">
                            {t('login.resendIn')} {resendTimer} {t('login.seconds')}
                          </span>
                        ) : (
                          <button
                            onClick={handleSendOtp}
                            className="text-brand-500 hover:underline font-medium"
                          >
                            {t('login.resendOtp')}
                          </button>
                        )}
                      </div>

                      <button
                        onClick={handleVerifyOtp}
                        disabled={loading}
                        className="shimmer-btn w-full py-3 rounded-xl bg-sangam-gradient text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform shadow-lg shadow-coral-500/20"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {t('login.verifyOtp')}
                      </button>

                      <button
                        onClick={() => { setOtpSent(false); setOtp(['','','','','','']); setError(''); }}
                        className="w-full text-center text-sm text-gray-500 hover:text-brand-500 transition-colors"
                      >
                        {t('common.back')}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Social tab */}
              {tab === 'social' && (
                <div className="space-y-3 animate-fadeIn">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                    {t('login.orContinueWith')}
                  </p>

                  {/* Google */}
                  <button
                    onClick={() => handleSocialLogin('google')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-navy-200 active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {t('login.continueWithGoogle')}
                  </button>

                  {/* Facebook */}
                  <button
                    onClick={() => handleSocialLogin('facebook')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-[#1877F2] text-white font-semibold hover:bg-[#166FE5] active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    <svg className="h-5 w-5" fill="white" viewBox="0 0 24 24">
                      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
                    </svg>
                    {t('login.continueWithFacebook')}
                  </button>

                  {/* Apple */}
                  <button
                    onClick={() => handleSocialLogin('apple')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    <svg className="h-5 w-5" fill="white" viewBox="0 0 24 24">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    {t('login.continueWithApple')}
                  </button>

                  {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-coral-50 dark:bg-coral-500/10 border border-coral-200 dark:border-coral-500/20 text-coral-600 dark:text-coral-400 text-sm animate-fadeIn">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* Sign up link */}
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                {t('login.dontHaveAccount')}{' '}
                <Link to="/signup" className="text-brand-500 font-semibold hover:underline">
                  {t('login.signUp')}
                </Link>
              </p>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400 mb-2">
                <Link to="/privacy" className="hover:text-brand-500 transition-colors">{t('login.privacyPolicy')}</Link>
                <span>·</span>
                <Link to="/terms" className="hover:text-brand-500 transition-colors">{t('login.termsOfService')}</Link>
                <span>·</span>
                <Link to="/help" className="hover:text-brand-500 transition-colors">{t('login.helpCenter')}</Link>
              </div>
              <p className="text-xs text-gray-400">© 2026 Sangam Technologies Pvt. Ltd. {t('login.rightsReserved')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Left panel with logo, typing tagline, feature carousel, user count */
function LeftPanel({ t, userCount }: { t: (key: string) => string; userCount: number | null }) {
  const [featureIdx, setFeatureIdx] = useState(0);
  const [typedText, setTypedText] = useState('');
  const tagline = t('login.tagline');

  // Typing animation
  useEffect(() => {
    let i = 0;
    setTypedText('');
    const interval = setInterval(() => {
      if (i <= tagline.length) {
        setTypedText(tagline.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 60);
    return () => clearInterval(interval);
  }, [tagline]);

  // Feature carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setFeatureIdx((prev) => (prev + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const feature = FEATURES[featureIdx];
  const FeatureIcon = feature.icon;

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <SangamLogo size={56} />
        <div>
          <h1 className="font-heading text-4xl font-extrabold bg-sangam-gradient bg-clip-text text-transparent">
            Sangam
          </h1>
        </div>
      </div>

      {/* Typing tagline */}
      <p className="font-heading text-xl text-gray-700 dark:text-gray-300 mb-8 h-7">
        {typedText}
        <span className="typing-cursor" />
      </p>

      {/* Feature carousel */}
      <div className="bg-white/50 dark:bg-navy-200/50 backdrop-blur-md rounded-2xl p-5 border border-white/30 dark:border-navy-300/30 mb-6 min-h-[120px]">
        <div key={featureIdx} className="animate-fadeIn">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-sangam-gradient flex items-center justify-center">
              <FeatureIcon className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              {t(`login.${feature.key}`)}
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 ps-13">
            {t(`login.${feature.descKey}`)}
          </p>
        </div>
        {/* Dots */}
        <div className="flex gap-1.5 mt-4">
          {FEATURES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === featureIdx ? 'w-6 bg-sangam-gradient' : 'w-1.5 bg-gray-300 dark:bg-navy-400'
              }`}
            />
          ))}
        </div>
      </div>

      {/* User count */}
      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
        <div className="flex -space-x-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 w-8 rounded-full border-2 border-[#f5f5f4] dark:border-[#0b1220] bg-sangam-gradient flex items-center justify-center text-white text-xs font-bold"
            >
              {['A', 'R', 'P', 'S'][i]}
            </div>
          ))}
        </div>
        <div className="text-sm">
          {userCount !== null ? (
            <>
              <span className="font-bold text-gray-900 dark:text-white">{userCount.toLocaleString()}+</span>{' '}
              {t('login.usersOnSangam')}
            </>
          ) : (
            <span className="text-gray-400">{t('login.joining')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
