import { useState, useEffect } from 'react';
import {
  Users, Activity, FileText, Flag, DollarSign, HardDrive,
  TrendingUp, UserX, Trash2, BadgeCheck, Megaphone, Wrench, Loader2,
} from 'lucide-react';
import { fetchAdminStats, logAdminAction } from '@/lib/adminApi';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount } from '@/lib/format';

export default function AdminDashboardPage() {
  usePageTitle('Admin Dashboard | Sangam');
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<{ date: string; value: number }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const s = await fetchAdminStats();
      setStats(s);
      // Build last 24h activity from posts
      const since = new Date(Date.now() - 24 * 3600000).toISOString();
      const { data: posts } = await supabase
        .from('posts')
        .select('created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      const byHour = new Map<string, number>();
      (posts || []).forEach((p: { created_at: string }) => {
        const h = new Date(p.created_at).getHours().toString();
        byHour.set(h, (byHour.get(h) || 0) + 1);
      });
      const hours = Array.from({ length: 24 }, (_, i) => ({
        date: `${i}h`,
        value: byHour.get(i.toString()) || 0,
      }));
      setActivity(hours);
    } catch (err) {
      console.error('admin dashboard error', err);
    } finally {
      setLoading(false);
    }
  }

  async function quickAction(action: string) {
    if (action === 'maintenance') {
      const { data } = await supabase.from('platform_settings').select('maintenance_mode').limit(1).maybeSingle();
      const current = (data as { maintenance_mode?: boolean } | null)?.maintenance_mode ?? false;
      const settings = await supabase.from('platform_settings').select('id').limit(1).maybeSingle();
      if (settings.data) {
        await supabase.from('platform_settings').update({ maintenance_mode: !current }).eq('id', (settings.data as { id: string }).id);
        await logAdminAction('toggle_maintenance', 'platform', null, { enabled: !current });
        alert(`Maintenance mode ${!current ? 'enabled' : 'disabled'}`);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: formatCount(stats?.totalUsers || 0), icon: Users, color: 'from-teal-500 to-cyan-500' },
    { label: 'Active Now', value: formatCount(stats?.activeNow || 0), icon: Activity, color: 'from-green-500 to-emerald-500' },
    { label: 'Posts Today', value: formatCount(stats?.postsToday || 0), icon: FileText, color: 'from-orange-500 to-red-500' },
    { label: 'Pending Reports', value: formatCount(stats?.pendingReports || 0), icon: Flag, color: 'from-red-500 to-pink-500' },
    { label: 'Revenue Today', value: `₹${formatCount(stats?.revenueToday || 0)}`, icon: DollarSign, color: 'from-amber-500 to-yellow-500' },
    { label: 'Storage Used', value: `${stats?.storageUsed || 0} MB`, icon: HardDrive, color: 'from-blue-500 to-indigo-500' },
  ];

  const quickActions = [
    { label: 'Ban User', icon: UserX, action: 'ban' },
    { label: 'Remove Post', icon: Trash2, action: 'remove' },
    { label: 'Verify Creator', icon: BadgeCheck, action: 'verify' },
    { label: 'Announcement', icon: Megaphone, action: 'announce' },
    { label: 'Maintenance', icon: Wrench, action: 'maintenance' },
  ];

  const maxActivity = Math.max(...activity.map((a) => a.value), 1);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Dashboard</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <p className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity graph */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-3">Last 24h Activity</h2>
          <div className="flex items-end justify-between gap-0.5 h-40">
            {activity.map((a, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t bg-sangam-gradient transition-all"
                    style={{ height: `${(a.value / maxActivity) * 100}%`, minHeight: a.value > 0 ? '4px' : '0' }}
                  />
                </div>
                {i % 4 === 0 && <span className="text-[8px] text-gray-400">{a.date}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-3">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map((qa) => (
              <button
                key={qa.action}
                onClick={() => quickAction(qa.action)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-300 w-full transition-colors"
              >
                <qa.icon className="h-4 w-4 text-brand-500" />
                {qa.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AdminStatsData {
  totalUsers: number;
  activeNow: number;
  postsToday: number;
  pendingReports: number;
  revenueToday: number;
  storageUsed: number;
}
