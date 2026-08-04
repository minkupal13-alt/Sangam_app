import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  Lock,
  Bell,
  Palette,
  Eye,
  Shield,
  Sliders,
  Ban,
  Globe,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';
import { useThemeStore } from '@/lib/themeStore';
import { setLanguage, LANGUAGES } from '@/lib/i18n';
import { useAuthStore } from '@/lib/authStore';
import { supabase } from '@/lib/supabase';
import { fetchBlockedUsers, fetchMutedUsers, blockUser, muteUser, unblockUser, unmuteUser } from '@/lib/safetyApi';
import type { Profile } from '@/lib/types';

type SettingsCategory = 'account' | 'privacy' | 'notifications' | 'appearance' | 'accessibility' | 'security' | 'content' | 'blocked';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const { theme, toggle } = useThemeStore();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'xl'>(() => {
    return (localStorage.getItem('sangam_font_size') as 'small' | 'medium' | 'large' | 'xl') || 'medium';
  });
  const [blockedUsers, setBlockedUsers] = useState<Profile[]>([]);
  const [mutedUsers, setMutedUsers] = useState<Profile[]>([]);
  const [reduceAnimations, setReduceAnimations] = useState(localStorage.getItem('sangam_reduce_animations') === 'true');
  const [highContrast, setHighContrast] = useState(localStorage.getItem('sangam_high_contrast') === 'true');

  usePageTitle(t('settings.title'));

  const categories: { key: SettingsCategory; label: string; icon: React.ReactNode }[] = [
    { key: 'account', label: t('settings.account'), icon: <User className="h-5 w-5" /> },
    { key: 'privacy', label: t('settings.privacy'), icon: <Lock className="h-5 w-5" /> },
    { key: 'notifications', label: t('settings.notifications'), icon: <Bell className="h-5 w-5" /> },
    { key: 'appearance', label: t('settings.appearance'), icon: <Palette className="h-5 w-5" /> },
    { key: 'accessibility', label: t('settings.accessibility'), icon: <Eye className="h-5 w-5" /> },
    { key: 'security', label: t('settings.security'), icon: <Shield className="h-5 w-5" /> },
    { key: 'content', label: t('settings.contentPrefs'), icon: <Sliders className="h-5 w-5" /> },
    { key: 'blocked', label: t('settings.blockedMuted'), icon: <Ban className="h-5 w-5" /> },
  ];

  function handleFontSize(size: 'small' | 'medium' | 'large' | 'xl') {
    setFontSize(size);
    localStorage.setItem('sangam_font_size', size);
    const root = document.documentElement;
    root.style.fontSize = size === 'small' ? '14px' : size === 'medium' ? '16px' : size === 'large' ? '18px' : '20px';
  }

  function handleReduceAnimations(val: boolean) {
    setReduceAnimations(val);
    localStorage.setItem('sangam_reduce_animations', String(val));
    document.documentElement.classList.toggle('reduce-animations', val);
  }

  function handleHighContrast(val: boolean) {
    setHighContrast(val);
    localStorage.setItem('sangam_high_contrast', String(val));
    document.documentElement.classList.toggle('high-contrast', val);
  }

  async function loadBlockedMuted() {
    if (!profile) return;
    const [blocked, muted] = await Promise.all([
      fetchBlockedUsers(profile.id),
      fetchMutedUsers(profile.id),
    ]);
    setBlockedUsers(blocked);
    setMutedUsers(muted);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-4 min-h-screen">
      {/* Mobile back */}
      <button onClick={() => navigate(-1)} className="sm:hidden flex items-center gap-1 text-gray-500">
        <ArrowLeft className="h-4 w-4" /> {t('common.back')}
      </button>

      {/* Sidebar */}
      <div className="sm:w-56 flex-shrink-0">
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white mb-4 px-2">{t('settings.title')}</h1>
        <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => {
                setActiveCategory(cat.key);
                if (cat.key === 'blocked') loadBlockedMuted();
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                activeCategory === cat.key
                  ? 'bg-sangam-gradient text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-200'
              }`}
            >
              {cat.icon}
              <span className="hidden sm:inline">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {activeCategory === 'appearance' && (
          <div className="space-y-5">
            <SectionTitle>{t('settings.appearance')}</SectionTitle>

            <Card>
              <CardRow label={t('settings.darkMode')}>
                <div className="flex gap-2">
                  {(['light', 'dark', 'system'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        if ((mode === 'dark') !== (theme === 'dark')) toggle();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                        (mode === 'dark' && theme === 'dark') || (mode === 'light' && theme === 'light')
                          ? 'bg-sangam-gradient text-white'
                          : 'bg-gray-100 dark:bg-navy-300 text-gray-500'
                      }`}
                    >
                      {mode === 'light' ? t('settings.lightMode') : mode === 'dark' ? t('settings.darkMode') : t('settings.systemMode')}
                    </button>
                  ))}
                </div>
              </CardRow>
            </Card>

            <Card>
              <CardRow label={t('settings.fontSize')}>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large', 'xl'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => handleFontSize(size)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                        fontSize === size ? 'bg-sangam-gradient text-white' : 'bg-gray-100 dark:bg-navy-300 text-gray-500'
                      }`}
                    >
                      {size === 'small' ? t('settings.small') : size === 'medium' ? t('settings.medium') : size === 'large' ? t('settings.large') : t('settings.extraLarge')}
                    </button>
                  ))}
                </div>
              </CardRow>
            </Card>

            <Card>
              <CardRow label={t('settings.language')}>
                <select
                  value={i18n.language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-navy-300 text-gray-900 dark:text-white text-sm focus:outline-none"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.englishName})
                    </option>
                  ))}
                </select>
              </CardRow>
            </Card>

            <Card>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Accent Theme</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { name: 'Teal-Coral', gradient: 'from-brand-400 to-coral-500' },
                  { name: 'Blue-Purple', gradient: 'from-blue-400 to-purple-500' },
                  { name: 'Green-Yellow', gradient: 'from-green-400 to-yellow-400' },
                  { name: 'Pink-Red', gradient: 'from-pink-400 to-red-500' },
                  { name: 'Monochrome', gradient: 'from-gray-600 to-gray-800' },
                  { name: 'Orange-Gold', gradient: 'from-orange-400 to-amber-500' },
                ].map((theme) => (
                  <button
                    key={theme.name}
                    className={`h-10 w-10 rounded-full bg-gradient-to-br ${theme.gradient} ring-2 ring-offset-2 dark:ring-offset-navy-100 ${
                      theme.name === 'Teal-Coral' ? 'ring-brand-400' : 'ring-transparent'
                    }`}
                    title={theme.name}
                  />
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeCategory === 'account' && (
          <div className="space-y-5">
            <SectionTitle>{t('settings.account')}</SectionTitle>
            <Card>
              <CardRow label={t('settings.changeEmail')} icon={<ChevronRight className="h-4 w-4" />} />
              <CardRow label={t('settings.changePassword')} icon={<ChevronRight className="h-4 w-4" />} />
              <CardRow label="Username" icon={<ChevronRight className="h-4 w-4" />} />
              <CardRow label="Phone Number" icon={<ChevronRight className="h-4 w-4" />} />
            </Card>
            <Card>
              <CardRow label={t('settings.dataExport')} icon={<ChevronRight className="h-4 w-4" />} />
              <CardRow label={t('settings.deactivateAccount')} icon={<ChevronRight className="h-4 w-4" />} danger />
              <CardRow label={t('settings.deleteAccount')} icon={<ChevronRight className="h-4 w-4" />} danger />
            </Card>
          </div>
        )}

        {activeCategory === 'privacy' && (
          <div className="space-y-5">
            <SectionTitle>{t('settings.privacy')}</SectionTitle>
            <Card>
              <CardRow label={t('settings.privateAccount')}>
                <ToggleSwitch checked={false} onChange={() => {}} />
              </CardRow>
            </Card>
            <Card>
              <CardRow label="Who can message me" icon={<ChevronRight className="h-4 w-4" />} />
              <CardRow label="Who can see followers" icon={<ChevronRight className="h-4 w-4" />} />
              <CardRow label="Who can tag me" icon={<ChevronRight className="h-4 w-4" />} />
              <CardRow label="Who can see liked posts" icon={<ChevronRight className="h-4 w-4" />} />
              <CardRow label="Hide online status">
                <ToggleSwitch checked={false} onChange={() => {}} />
              </CardRow>
              <CardRow label={t('settings.closeFriendsList')} icon={<ChevronRight className="h-4 w-4" />} />
            </Card>
          </div>
        )}

        {activeCategory === 'notifications' && (
          <div className="space-y-5">
            <SectionTitle>{t('settings.notifications')}</SectionTitle>
            <Card>
              <CardRow label="Push Notifications">
                <ToggleSwitch checked={true} onChange={() => {}} />
              </CardRow>
              <CardRow label="Email Notifications">
                <ToggleSwitch checked={true} onChange={() => {}} />
              </CardRow>
            </Card>
            <Card>
              {['Likes', 'Comments', 'Follows', 'Mentions', 'Messages', 'Echoes', 'Events', 'Live Streams', 'Audio Rooms', 'Marketplace', 'Sangam Points', 'Birthdays', 'Memories'].map((item) => (
                <CardRow key={item} label={item}>
                  <ToggleSwitch checked={true} onChange={() => {}} />
                </CardRow>
              ))}
            </Card>
          </div>
        )}

        {activeCategory === 'accessibility' && (
          <div className="space-y-5">
            <SectionTitle>{t('settings.accessibility')}</SectionTitle>
            <Card>
              <CardRow label={t('settings.reduceAnimations')}>
                <ToggleSwitch checked={reduceAnimations} onChange={handleReduceAnimations} />
              </CardRow>
              <CardRow label={t('settings.highContrast')}>
                <ToggleSwitch checked={highContrast} onChange={handleHighContrast} />
              </CardRow>
              <CardRow label={t('settings.autoPlay')}>
                <select className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-navy-300 text-gray-900 dark:text-white text-sm focus:outline-none">
                  <option>Always</option>
                  <option>Wi-Fi Only</option>
                  <option>Never</option>
                </select>
              </CardRow>
              <CardRow label={t('settings.closedCaptions')}>
                <ToggleSwitch checked={false} onChange={() => {}} />
              </CardRow>
              <CardRow label={t('settings.screenReader')}>
                <ToggleSwitch checked={false} onChange={() => {}} />
              </CardRow>
            </Card>
          </div>
        )}

        {activeCategory === 'security' && (
          <div className="space-y-5">
            <SectionTitle>{t('settings.security')}</SectionTitle>
            <Card>
              <CardRow label={t('settings.twoFactor')}>
                <ToggleSwitch checked={false} onChange={() => {}} />
              </CardRow>
              <CardRow label="Backup Codes" icon={<ChevronRight className="h-4 w-4" />} />
            </Card>
            <Card>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-3 pt-3 mb-2">{t('settings.activeSessions')}</p>
              <div className="px-3 pb-3 text-sm text-gray-400">
                <p>This device · Current</p>
              </div>
            </Card>
            <Card>
              <CardRow label={t('settings.loginHistory')} icon={<ChevronRight className="h-4 w-4" />} />
            </Card>
          </div>
        )}

        {activeCategory === 'content' && (
          <div className="space-y-5">
            <SectionTitle>{t('settings.contentPrefs')}</SectionTitle>
            <Card>
              <CardRow label="Interests" icon={<ChevronRight className="h-4 w-4" />} />
              <CardRow label={t('settings.sensitiveFilter')}>
                <ToggleSwitch checked={true} onChange={() => {}} />
              </CardRow>
              <CardRow label="Content Language" icon={<ChevronRight className="h-4 w-4" />} />
              <CardRow label={t('settings.mutedWords')} icon={<ChevronRight className="h-4 w-4" />} />
            </Card>
          </div>
        )}

        {activeCategory === 'blocked' && (
          <div className="space-y-5">
            <SectionTitle>{t('settings.blockedMuted')}</SectionTitle>
            <Card>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-3 pt-3 mb-2">Blocked Users</p>
              {blockedUsers.length === 0 ? (
                <p className="px-3 pb-3 text-sm text-gray-400">No blocked users</p>
              ) : (
                blockedUsers.map((u) => (
                  <CardRow key={u.id} label={u.full_name}>
                    <button
                      onClick={async () => { await unblockUser(u.id); loadBlockedMuted(); }}
                      className="px-3 py-1 rounded-full bg-gray-100 dark:bg-navy-300 text-sm font-semibold text-gray-600 dark:text-gray-300"
                    >
                      {t('common.unblock')}
                    </button>
                  </CardRow>
                ))
              )}
            </Card>
            <Card>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-3 pt-3 mb-2">Muted Users</p>
              {mutedUsers.length === 0 ? (
                <p className="px-3 pb-3 text-sm text-gray-400">No muted users</p>
              ) : (
                mutedUsers.map((u) => (
                  <CardRow key={u.id} label={u.full_name}>
                    <button
                      onClick={async () => { await unmuteUser(u.id); loadBlockedMuted(); }}
                      className="px-3 py-1 rounded-full bg-gray-100 dark:bg-navy-300 text-sm font-semibold text-gray-600 dark:text-gray-300"
                    >
                      {t('common.unmute')}
                    </button>
                  </CardRow>
                ))
              )}
            </Card>
          </div>
        )}

        {/* Verification + Add Account */}
        <div className="mt-5 space-y-2">
          <button
            onClick={() => navigate('/settings/verification')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.applyVerification')}</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <span className="text-sm font-semibold text-red-500">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-white mb-3">{children}</h2>;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden">
      {children}
    </div>
  );
}

function CardRow({ label, children, icon, danger }: { label: string; children?: React.ReactNode; icon?: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-3 border-b border-gray-50 dark:border-navy-300 last:border-0 ${danger ? 'text-red-500' : ''}`}>
      <span className={`text-sm font-medium ${danger ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{label}</span>
      {children || icon}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`h-6 w-11 rounded-full transition-colors ${checked ? 'bg-sangam-gradient' : 'bg-gray-200 dark:bg-navy-300'}`}
    >
      <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}
