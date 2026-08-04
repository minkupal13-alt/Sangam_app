import { useState, useEffect } from 'react';
import { BarChart3, Loader2, Download, Users, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount } from '@/lib/format';
import { exportToCsv } from '@/lib/adminApi';

export default function AdminAnalyticsPage() {
  usePageTitle('Analytics | Admin');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, totalFlicks: 0, totalVideos: 0, signups: [] as { date: string; count: number }[] });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, postsRes, flicksRes, videosRes, signupsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('flicks').select('*', { count: 'exact', head: true }),
        supabase.from('videos').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('created_at').order('created_at', { ascending: false }).limit(100),
      ]);

      const byDate = new Map<string, number>();
      (signupsRes.data || []).forEach((p: { created_at: string }) => {
        const d = new Date(p.created_at).toISOString().split('T')[0];
        byDate.set(d, (byDate.get(d) || 0) + 1);
      });
      const signups = Array.from(byDate.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

      setStats({
        totalUsers: usersRes.count || 0,
        totalPosts: postsRes.count || 0,
        totalFlicks: flicksRes.count || 0,
        totalVideos: videosRes.count || 0,
        signups,
      });
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>;
  }

  const maxSignups = Math.max(...stats.signups.map((s) => s.count), 1);
  const cards = [
    { label: 'Total Users', value: formatCount(stats.totalUsers), icon: Users },
    { label: 'Total Posts', value: formatCount(stats.totalPosts), icon: FileText },
    { label: 'Total Flicks', value: formatCount(stats.totalFlicks), icon: TrendingUp },
    { label: 'Total Videos', value: formatCount(stats.totalVideos), icon: FileText },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Analytics</h1>
        <button onClick={() => exportToCsv('analytics.csv', stats.signups)} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm font-semibold text-gray-600 dark:text-gray-300 active:scale-95 transition-transform">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
            <c.icon className="h-5 w-5 text-brand-500 mb-2" />
            <p className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white">{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
        <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-3">New Signups (Last 30 days)</h2>
        {stats.signups.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No signup data.</p>
        ) : (
          <div className="flex items-end justify-between gap-0.5 h-40">
            {stats.signups.map((s, i) => (
              <div key={i} className="flex-1 flex items-end">
                <div className="w-full rounded-t bg-sangam-gradient" style={{ height: `${(s.count / maxSignups) * 100}%`, minHeight: '3px' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
