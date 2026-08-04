import { useState, useEffect } from 'react';
import { Settings, Loader2, Plus, X, Save, Wrench } from 'lucide-react';
import { fetchPlatformSettings, updatePlatformSettings, type PlatformSettings } from '@/lib/adminApi';
import { usePageTitle } from '@/lib/usePageTitle';

const TOGGLES: { key: keyof PlatformSettings; label: string }[] = [
  { key: 'new_signups_enabled', label: 'New Signups' },
  { key: 'google_oauth_enabled', label: 'Google OAuth' },
  { key: 'marketplace_enabled', label: 'Marketplace' },
  { key: 'live_streaming_enabled', label: 'Live Streaming' },
  { key: 'audio_rooms_enabled', label: 'Audio Rooms' },
  { key: 'monetization_enabled', label: 'Monetization' },
  { key: 'tips_enabled', label: 'Tips' },
  { key: 'subscriptions_enabled', label: 'Subscriptions' },
  { key: 'coins_enabled', label: 'Coins' },
  { key: 'jobs_enabled', label: 'Jobs' },
  { key: 'fundraisers_enabled', label: 'Fundraisers' },
  { key: 'podcasts_enabled', label: 'Podcasts' },
  { key: 'groups_enabled', label: 'Groups' },
  { key: 'pages_enabled', label: 'Pages' },
  { key: 'watch_party_enabled', label: 'Watch Party' },
  { key: 'duet_stitch_enabled', label: 'Duet & Stitch' },
  { key: 'post_scheduling_enabled', label: 'Post Scheduling' },
];

const LIMITS: { key: keyof PlatformSettings; label: string; suffix: string }[] = [
  { key: 'max_file_size_mb', label: 'Max File Size', suffix: 'MB' },
  { key: 'max_video_duration_min', label: 'Max Video Duration', suffix: 'min' },
  { key: 'max_post_length', label: 'Max Post Length', suffix: 'chars' },
  { key: 'daily_post_limit', label: 'Daily Post Limit', suffix: 'posts' },
  { key: 'min_withdrawal_amount', label: 'Min Withdrawal', suffix: '₹' },
];

export default function AdminSettingsPage() {
  usePageTitle('Settings | Admin');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newWord, setNewWord] = useState('');

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const s = await fetchPlatformSettings();
      setSettings(s);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      await updatePlatformSettings({
        maintenance_mode: settings.maintenance_mode,
        maintenance_message: settings.maintenance_message,
        blocked_words: settings.blocked_words,
        max_file_size_mb: settings.max_file_size_mb,
        max_video_duration_min: settings.max_video_duration_min,
        max_post_length: settings.max_post_length,
        daily_post_limit: settings.daily_post_limit,
        min_withdrawal_amount: settings.min_withdrawal_amount,
      });
    } catch (err) { console.error(err); }
    setSaving(false);
  }

  async function toggleFeature(key: keyof PlatformSettings) {
    if (!settings) return;
    const newValue = !settings[key];
    setSettings({ ...settings, [key]: newValue });
    try {
      await updatePlatformSettings({ [key]: newValue } as Partial<PlatformSettings>);
    } catch (err) { console.error(err); }
  }

  function addWord() {
    if (!settings || !newWord.trim()) return;
    setSettings({ ...settings, blocked_words: [...settings.blocked_words, newWord.trim()] });
    setNewWord('');
  }

  function removeWord(word: string) {
    if (!settings) return;
    setSettings({ ...settings, blocked_words: settings.blocked_words.filter((w) => w !== word) });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>;
  }

  if (!settings) {
    return <div className="text-center py-20 text-gray-400 text-sm">Failed to load settings.</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Platform Settings</h1>
      </div>

      {/* Feature toggles */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4 mb-4">
        <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-3">Feature Toggles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 cursor-pointer">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.label}</span>
              <button
                type="button"
                onClick={() => toggleFeature(t.key)}
                className={`relative h-6 w-11 rounded-full transition-colors ${settings[t.key] ? 'bg-brand-500' : 'bg-gray-300 dark:bg-navy-50'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings[t.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Maintenance mode */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4 mb-4">
        <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-orange-500" /> Maintenance Mode
        </h2>
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode })}
            className={`relative h-6 w-11 rounded-full transition-colors ${settings.maintenance_mode ? 'bg-red-500' : 'bg-gray-300 dark:bg-navy-50'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings.maintenance_mode ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{settings.maintenance_mode ? 'Enabled' : 'Disabled'}</span>
        </div>
        <input
          value={settings.maintenance_message}
          onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
          placeholder="Maintenance message..."
          className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500"
        />
      </div>

      {/* Blocked words */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4 mb-4">
        <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-3">Blocked Words</h2>
        <div className="flex gap-2 mb-3">
          <input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWord(); } }}
            placeholder="Add a word..."
            className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500"
          />
          <button onClick={addWord} className="h-9 w-9 rounded-xl bg-sangam-gradient flex items-center justify-center active:scale-95 transition-transform">
            <Plus className="h-4 w-4 text-white" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.blocked_words.length === 0 ? (
            <p className="text-xs text-gray-400">No blocked words.</p>
          ) : (
            settings.blocked_words.map((word) => (
              <span key={word} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-xs font-semibold text-red-600 dark:text-red-400">
                {word}
                <button onClick={() => removeWord(word)}><X className="h-3 w-3" /></button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Platform limits */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4 mb-4">
        <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-3">Platform Limits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LIMITS.map((l) => (
            <div key={l.key}>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{l.label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings[l.key] as number}
                  onChange={(e) => setSettings({ ...settings, [l.key]: parseInt(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
                />
                <span className="text-xs text-gray-400">{l.suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform disabled:opacity-50">
        <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
