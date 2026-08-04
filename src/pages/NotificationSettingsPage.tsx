import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, UserPlus, AtSign, Send, Repeat2, Loader2 } from 'lucide-react';
import type { NotificationSettings } from '@/lib/types';
import { getNotificationSettings, updateNotificationSettings } from '@/lib/notificationApi';
import { usePageTitle } from '@/lib/usePageTitle';

export default function NotificationSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  usePageTitle('Notification Settings | Sangam');

  useEffect(() => {
    getNotificationSettings()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggle(key: keyof NotificationSettings) {
    if (!settings) return;
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSaving(true);
    await updateNotificationSettings({ [key]: !settings[key] });
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!settings) {
    return <p className="text-center text-gray-400 py-20">Failed to load settings.</p>;
  }

  const toggles: { key: keyof NotificationSettings; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'likes_enabled', label: 'Likes', icon: <Heart className="h-5 w-5" />, color: 'text-coral-500' },
    { key: 'comments_enabled', label: 'Comments', icon: <MessageCircle className="h-5 w-5" />, color: 'text-brand-500' },
    { key: 'follows_enabled', label: 'Follows', icon: <UserPlus className="h-5 w-5" />, color: 'text-brand-500' },
    { key: 'mentions_enabled', label: 'Mentions', icon: <AtSign className="h-5 w-5" />, color: 'text-green-500' },
    { key: 'messages_enabled', label: 'Messages', icon: <Send className="h-5 w-5" />, color: 'text-brand-500' },
    { key: 'echoes_enabled', label: 'Echoes', icon: <Repeat2 className="h-5 w-5" />, color: 'text-coral-500' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-navy-300">
        <button
          onClick={() => navigate('/notifications')}
          className="h-9 w-9 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-heading font-extrabold text-lg text-gray-900 dark:text-white">
          Notification Settings
        </h1>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-auto" />}
      </div>

      {/* Description */}
      <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        Choose which notifications you want to receive. Toggle off any type you don't want to be notified about.
      </p>

      {/* Toggle list */}
      <div className="px-4 pb-4 space-y-2">
        {toggles.map((t) => (
          <div
            key={t.key}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300"
          >
            <div className="flex items-center gap-3">
              <span className={t.color}>{t.icon}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{t.label}</span>
            </div>
            <ToggleSwitch
              checked={settings[t.key] as boolean}
              onChange={() => toggle(t.key)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative h-7 w-12 rounded-full transition-colors ${
        checked ? 'bg-sangam-gradient' : 'bg-gray-200 dark:bg-navy-300'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
