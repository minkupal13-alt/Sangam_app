import { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  Heart,
  DollarSign,
  TrendingUp,
  CalendarClock,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Image,
  Video,
  Film,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount, timeAgo } from '@/lib/format';
import { fetchTotalTips } from '@/lib/monetizationApi';
import { fetchScheduledPosts } from '@/lib/schedulingApi';
import type { ScheduledPost } from '@/lib/types';

interface ContentRow {
  id: string;
  title: string;
  type: 'text' | 'image' | 'video' | 'flick';
  views: number;
  likes: number;
  comments: number;
  created_at: string;
}

// Chart data
const followersGrowth = [120, 180, 240, 320, 410, 520, 680, 820, 950, 1100, 1280, 1450];
const engagementBars = [
  { label: 'Mon', value: 45 },
  { label: 'Tue', value: 62 },
  { label: 'Wed', value: 38 },
  { label: 'Thu', value: 78 },
  { label: 'Fri', value: 91 },
  { label: 'Sat', value: 85 },
  { label: 'Sun', value: 54 },
];
const contentBreakdown = [
  { label: 'Posts', value: 45, color: '#14b8a6' },
  { label: 'Images', value: 25, color: '#f97316' },
  { label: 'Videos', value: 20, color: '#8b5cf6' },
  { label: 'Flicks', value: 10, color: '#ec4899' },
];

const CONTENT_ICONS: Record<string, typeof FileText> = {
  text: FileText,
  image: Image,
  video: Video,
  flick: Film,
};

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const [earnings, setEarnings] = useState(0);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  usePageTitle('Dashboard | Sangam');

  useEffect(() => {
    if (profile) {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [profile]);

  async function loadDashboard() {
    if (!profile) return;
    setLoading(true);
    try {
      const [tips, scheduled] = await Promise.all([
        fetchTotalTips(profile.id),
        fetchScheduledPosts(),
      ]);
      setEarnings(tips as number);
      setScheduledPosts(scheduled as ScheduledPost[]);
    } catch (err) {
      console.error('loadDashboard error', err);
    } finally {
      setLoading(false);
    }
  }

  // Mock derived stats (in production these would come from an analytics API)
  const followers = profile?.followers_count ?? 0;
  const views = Math.round(followers * 8.3);
  const likes = Math.round(followers * 2.1);

  const stats = [
    {
      label: 'Followers',
      value: formatCount(followers),
      icon: Users,
      change: '+12%',
      up: true,
    },
    {
      label: 'Profile Views',
      value: formatCount(views),
      icon: Eye,
      change: '+8%',
      up: true,
    },
    {
      label: 'Likes',
      value: formatCount(likes),
      icon: Heart,
      change: '+23%',
      up: true,
    },
    {
      label: 'Earnings',
      value: `$${earnings.toFixed(2)}`,
      icon: DollarSign,
      change: '+5%',
      up: true,
    },
  ];

  // Line chart helpers
  const maxFollower = Math.max(...followersGrowth);
  const chartW = 300;
  const chartH = 120;
  const points = followersGrowth
    .map((v, i) => {
      const x = (i / (followersGrowth.length - 1)) * chartW;
      const y = chartH - (v / maxFollower) * (chartH - 10) - 5;
      return `${x},${y}`;
    })
    .join(' ');
  const areaPoints = `0,${chartH} ${points} ${chartW},${chartH}`;

  // Bar chart helpers
  const maxEngagement = Math.max(...engagementBars.map((b) => b.value));

  // Pie chart helpers
  const pieTotal = contentBreakdown.reduce((s, c) => s + c.value, 0);
  let cumulative = 0;
  const pieSegments = contentBreakdown.map((c) => {
    const startAngle = (cumulative / pieTotal) * 360;
    cumulative += c.value;
    const endAngle = (cumulative / pieTotal) * 360;
    return { ...c, startAngle, endAngle };
  });

  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(cx: number, cy: number, r: number, start: number, end: number) {
    const startPt = polarToCartesian(cx, cy, r, end);
    const endPt = polarToCartesian(cx, cy, r, start);
    const largeArc = end - start <= 180 ? '0' : '1';
    return `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 0 ${endPt.x} ${endPt.y}`;
  }

  // Mock content performance table
  const contentTable: ContentRow[] = [
    { id: '1', title: 'Morning thoughts on...', type: 'text', views: 1240, likes: 89, comments: 12, created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: '2', title: 'Sunset hike photo', type: 'image', views: 890, likes: 156, comments: 23, created_at: new Date(Date.now() - 172800000).toISOString() },
    { id: '3', title: 'Quick tutorial flick', type: 'flick', views: 2100, likes: 234, comments: 45, created_at: new Date(Date.now() - 259200000).toISOString() },
    { id: '4', title: 'Community Q&A video', type: 'video', views: 1560, likes: 178, comments: 34, created_at: new Date(Date.now() - 345600000).toISOString() },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
          Dashboard
        </h1>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-xl bg-sangam-gradient flex items-center justify-center">
                <s.icon className="h-4 w-4 text-white" />
              </div>
              <span
                className={`flex items-center gap-0.5 text-xs font-bold ${
                  s.up ? 'text-brand-500' : 'text-red-500'
                }`}
              >
                {s.up ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {s.change}
              </span>
            </div>
            <p className="font-heading font-extrabold text-lg text-gray-900 dark:text-white mt-2">
              {s.value}
            </p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {/* Line chart - Followers growth */}
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-coral-500" />
            Followers Growth
          </h2>
          <svg viewBox={`0 0 ${chartW} ${chartH + 20}`} className="w-full h-auto">
            <defs>
              <linearGradient id="followersGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={areaPoints} fill="url(#followersGrad)" />
            <polyline
              points={points}
              fill="none"
              stroke="#14b8a6"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {followersGrowth.map((v, i) => {
              const x = (i / (followersGrowth.length - 1)) * chartW;
              const y = chartH - (v / maxFollower) * (chartH - 10) - 5;
              return <circle key={i} cx={x} cy={y} r="2.5" fill="#f97316" />;
            })}
          </svg>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>Jan</span>
            <span>Dec</span>
          </div>
        </div>

        {/* Bar chart - Engagement */}
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-coral-500" />
            Weekly Engagement
          </h2>
          <div className="flex items-end justify-between gap-1.5 h-32">
            {engagementBars.map((b) => (
              <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-lg bg-sangam-gradient transition-all"
                    style={{ height: `${(b.value / maxEngagement) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pie chart - Content breakdown */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4 mb-5">
        <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-coral-500" />
          Content Breakdown
        </h2>
        <div className="flex items-center gap-6">
          <svg viewBox="0 0 100 100" className="h-32 w-32 flex-shrink-0">
            {pieSegments.map((seg, i) => (
              <path
                key={i}
                d={describeArc(50, 50, 40, seg.startAngle, seg.endAngle)}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
              />
            ))}
          </svg>
          <div className="flex-1 space-y-2">
            {contentBreakdown.map((c) => (
              <div key={c.label} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {c.label}
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {c.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content performance table */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden mb-5">
        <div className="p-4 border-b border-gray-100 dark:border-navy-300">
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">
            Content Performance
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-50 dark:border-navy-300/50">
                <th className="text-left font-semibold px-4 py-2">Content</th>
                <th className="text-right font-semibold px-4 py-2">Views</th>
                <th className="text-right font-semibold px-4 py-2">Likes</th>
                <th className="text-right font-semibold px-4 py-2 hidden sm:table-cell">
                  Comments
                </th>
                <th className="text-right font-semibold px-4 py-2 hidden sm:table-cell">
                  Posted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-navy-300/50">
              {contentTable.map((row) => {
                const Icon = CONTENT_ICONS[row.type] || FileText;
                return (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-sangam-gradient flex items-center justify-center flex-shrink-0">
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-gray-900 dark:text-white font-medium truncate max-w-[140px]">
                          {row.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                      {formatCount(row.views)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                      {formatCount(row.likes)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                      {formatCount(row.comments)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">
                      {timeAgo(row.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scheduled posts */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-navy-300 flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4 text-coral-500" />
          <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">
            Scheduled Posts
          </h2>
          <span className="ml-auto text-xs text-gray-400">
            {scheduledPosts.length} scheduled
          </span>
        </div>
        {scheduledPosts.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            No scheduled posts. Plan your content ahead of time!
          </p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-navy-300/50">
            {scheduledPosts.map((post) => {
              const Icon = CONTENT_ICONS[post.post_data.media_type || 'text'] || FileText;
              const scheduledDate = new Date(post.scheduled_for);
              return (
                <div key={post.id} className="flex items-center gap-3 p-3">
                  <div className="h-9 w-9 rounded-lg bg-sangam-gradient flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 dark:text-white truncate">
                      {post.post_data.content || '(No text)'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {scheduledDate.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-xs font-semibold text-brand-600 dark:text-brand-400 flex-shrink-0">
                    Scheduled
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
