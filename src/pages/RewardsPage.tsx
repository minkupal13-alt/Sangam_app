import { useState, useEffect } from 'react';
import {
  Award,
  Loader2,
  Trophy,
  History,
  Star,
  TrendingUp,
  Zap,
  Crown,
  Medal,
  Flame,
  Gift,
  Target,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount, timeAgo } from '@/lib/format';
import {
  fetchUserPoints,
  fetchPointsHistory,
  fetchUserBadges,
  getLevel,
  LEVELS,
  BADGE_CRITERIA,
  fetchLeaderboard,
} from '@/lib/pointsApi';
import type { PointsHistory, UserBadge } from '@/lib/types';

type Tab = 'badges' | 'history' | 'leaderboard';

interface LeaderboardEntry {
  profile: { id: string; username: string; full_name: string; avatar_url: string | null };
  points: number;
  level: number;
}

export default function RewardsPage() {
  const profile = useAuthStore((s) => s.profile);
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<PointsHistory[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('badges');

  usePageTitle('Rewards | Sangam');

  useEffect(() => {
    if (profile) {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [profile]);

  async function loadAll() {
    if (!profile) return;
    setLoading(true);
    try {
      const [pts, hist, bdgs, lb] = await Promise.all([
        fetchUserPoints(profile.id),
        fetchPointsHistory(profile.id),
        fetchUserBadges(profile.id),
        fetchLeaderboard(),
      ]);
      setPoints(pts?.points ?? 0);
      setHistory(hist);
      setBadges(bdgs);
      setLeaderboard(lb as LeaderboardEntry[]);
    } catch (err) {
      console.error('loadRewards error', err);
    } finally {
      setLoading(false);
    }
  }

  const level = getLevel(points);
  const nextLevel = LEVELS.find((l) => l.min > points);
  const progressPct = nextLevel
    ? Math.min(
        100,
        Math.round(((points - level.nextAt) / (nextLevel.min - level.nextAt)) * 100),
      )
    : 100;
  const earnedBadgeKeys = new Set(badges.map((b) => b.badge_type));

  const BADGE_ICONS: Record<string, typeof Star> = {
    first_post: Star,
    streak_7: Flame,
    streak_30: Flame,
    social_butterfly: Award,
    influencer: Crown,
    viral: Zap,
    helpful: Gift,
    creator: Medal,
    explorer: Target,
    legend: Trophy,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Award className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
          Rewards
        </h1>
      </div>

      {/* Points card */}
      <div className="rounded-2xl bg-sangam-gradient p-5 text-white mb-5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-4 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">
                Your Points
              </p>
              <p className="font-heading font-extrabold text-4xl mt-1">
                {formatCount(points)}
              </p>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex flex-col items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
              <span className="text-xs font-bold mt-0.5">Lvl {level.level}</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-white/80 mb-1">
              <span className="font-semibold">{level.name}</span>
              {nextLevel ? (
                <span>{formatCount(nextLevel.min - points)} to next level</span>
              ) : (
                <span>Max level reached!</span>
              )}
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(
          [
            { key: 'badges', label: 'Badges', icon: Award },
            { key: 'history', label: 'History', icon: History },
            { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${
              tab === t.key
                ? 'bg-sangam-gradient text-white'
                : 'bg-white dark:bg-navy-200 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-300'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Badges tab */}
      {tab === 'badges' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {Object.entries(BADGE_CRITERIA).map(([badgeKey, badge]) => {
            const earned = earnedBadgeKeys.has(badgeKey);
            const Icon = BADGE_ICONS[badgeKey] || Award;
            return (
              <div
                key={badgeKey}
                className={`rounded-2xl p-3 flex flex-col items-center text-center border transition-all ${
                  earned
                    ? 'bg-white dark:bg-navy-200 border-gray-100 dark:border-navy-300'
                    : 'bg-gray-50 dark:bg-navy-300/50 border-gray-100 dark:border-navy-300 opacity-60'
                }`}
              >
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center mb-2 ${
                    earned ? 'bg-sangam-gradient' : 'bg-gray-200 dark:bg-navy-300'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${earned ? 'text-white' : 'text-gray-400 dark:text-navy-50'}`}
                  />
                </div>
                <p
                  className={`text-xs font-bold ${
                    earned
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {badgeKey}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
                  {badge.description}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden">
          {history.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              No points history yet. Start posting to earn points!
            </p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-navy-300/50">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 p-3">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      h.points >= 0
                        ? 'bg-brand-50 dark:bg-brand-900/20'
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <TrendingUp
                      className={`h-4 w-4 ${
                        h.points >= 0
                          ? 'text-brand-500'
                          : 'text-red-500 rotate-180'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {h.action}
                    </p>
                    <p className="text-xs text-gray-400">{timeAgo(h.created_at)}</p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      h.points >= 0 ? 'text-brand-500' : 'text-red-500'
                    }`}
                  >
                    {h.points >= 0 ? '+' : ''}
                    {h.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard tab */}
      {tab === 'leaderboard' && (
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden">
          {leaderboard.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              No leaderboard data yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-navy-300/50">
              {leaderboard.map((entry, i) => {
                const isMe = entry.profile?.id === profile?.id;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                return (
                  <div
                    key={entry.profile?.id || i}
                    className={`flex items-center gap-3 p-3 ${
                      isMe ? 'bg-brand-50 dark:bg-brand-900/10' : ''
                    }`}
                  >
                    <div className="w-8 text-center flex-shrink-0">
                      {medal ? (
                        <span className="text-lg">{medal}</span>
                      ) : (
                        <span className="text-sm font-bold text-gray-400">
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 dark:bg-navy-300 flex-shrink-0">
                      {entry.profile?.avatar_url ? (
                        <img
                          src={entry.profile.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {(entry.profile?.full_name || entry.profile?.username || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {entry.profile?.full_name || entry.profile?.username}
                        {isMe && (
                          <span className="ml-1.5 text-xs text-brand-500">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 truncate">@{entry.profile?.username}</p>
                    </div>
                    <span className="text-sm font-bold text-coral-500">
                      {formatCount(entry.points)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
