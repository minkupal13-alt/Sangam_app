import { useState, useEffect } from 'react';
import { Megaphone, Loader2, X, AlertTriangle, Send } from 'lucide-react';
import { fetchAnnouncements, createAnnouncement, type AdminAnnouncement } from '@/lib/adminApi';
import { usePageTitle } from '@/lib/usePageTitle';
import { timeAgo } from '@/lib/format';

export default function AdminAnnouncementsPage() {
  usePageTitle('Announcements | Admin');
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', message: '', type: 'info', target: 'all', target_value: '',
    channels: ['pulse'], scheduled_for: '', expires_at: '', is_emergency: false,
  });

  useEffect(() => { loadAnnouncements(); }, []);

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const a = await fetchAnnouncements();
      setAnnouncements(a);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    try {
      await createAnnouncement({
        title: form.title, message: form.message, type: form.type,
        target: form.target, channels: form.channels,
        scheduled_for: form.scheduled_for || null,
        expires_at: form.expires_at || null,
        is_emergency: form.is_emergency,
      });
      setShowCreate(false);
      setForm({ title: '', message: '', type: 'info', target: 'all', target_value: '', channels: ['pulse'], scheduled_for: '', expires_at: '', is_emergency: false });
      loadAnnouncements();
    } catch (err) { console.error(err); }
  }

  function toggleChannel(ch: string) {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(ch) ? prev.channels.filter((c) => c !== ch) : [...prev.channels, ch],
    }));
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Megaphone className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Announcements</h1>
        <button onClick={() => setShowCreate(true)} className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform">
          <Megaphone className="h-4 w-4" /> New
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Megaphone className="h-12 w-12 text-gray-200 dark:text-navy-50 mb-3" />
          <p className="text-gray-400 text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className={`rounded-2xl border p-4 ${a.is_emergency ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10' : 'border-gray-100 dark:border-navy-300 bg-white dark:bg-navy-200'}`}>
              <div className="flex items-start gap-2">
                {a.is_emergency && <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white">{a.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{a.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-navy-300 capitalize">{a.type}</span>
                    <span>·</span>
                    <span>{timeAgo(a.created_at)}</span>
                    {a.scheduled_for && <><span>·</span><span>Scheduled: {new Date(a.scheduled_for).toLocaleString()}</span></>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-navy-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-white dark:bg-navy-200 z-10">
              <button onClick={() => setShowCreate(false)} className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center"><X className="h-4 w-4 text-gray-500" /></button>
              <h2 className="font-heading font-bold text-gray-900 dark:text-white">New Announcement</h2>
              <div className="w-8" />
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" required className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500" />
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Message..." required className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none">
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="update">Update</option>
                  <option value="event">Event</option>
                </select>
                <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none">
                  <option value="all">All Users</option>
                  <option value="role">By Role</option>
                  <option value="country">By Country</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Channels</label>
                <div className="flex gap-2">
                  {['pulse', 'banner', 'email', 'toast'].map((ch) => (
                    <button key={ch} type="button" onClick={() => toggleChannel(ch)} className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${form.channels.includes(ch) ? 'bg-sangam-gradient text-white' : 'bg-gray-100 dark:bg-navy-300 text-gray-500'}`}>{ch}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} className="px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none" />
                <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none" />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.is_emergency} onChange={(e) => setForm({ ...form, is_emergency: e.target.checked })} className="rounded" />
                Emergency broadcast
              </label>
              <button type="submit" className="w-full py-3 rounded-xl bg-sangam-gradient text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Send className="h-4 w-4" /> Publish
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
