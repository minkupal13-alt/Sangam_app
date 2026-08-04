import { supabase } from '@/lib/supabase';
import type { UserPoints, PointsHistory, UserBadge, Profile } from '@/lib/types';

export const POINTS = { daily_login: 5, post: 10, like: 1, comment: 2, share: 3, follow: 5 } as const;

export const LEVELS = [
  { name: 'Bronze', min: 0, max: 100, color: 'from-amber-600 to-amber-800' },
  { name: 'Silver', min: 100, max: 500, color: 'from-gray-300 to-gray-500' },
  { name: 'Gold', min: 500, max: 2000, color: 'from-amber-400 to-yellow-500' },
  { name: 'Platinum', min: 2000, max: Infinity, color: 'from-cyan-300 to-blue-400' },
];

export function getLevel(points: number): { name: string; level: number; color: string; nextAt: number } {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].min) {
      const next = i < LEVELS.length - 1 ? LEVELS[i + 1].min : points;
      return { name: LEVELS[i].name, level: i + 1, color: LEVELS[i].color, nextAt: next };
    }
  }
  return { name: 'Bronze', level: 1, color: LEVELS[0].color, nextAt: 100 };
}

export async function fetchUserPoints(userId: string): Promise<UserPoints | null> {
  const { data, error } = await supabase.from('user_points').select('*').eq('user_id', userId).maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function ensureUserPoints(userId: string): Promise<UserPoints> {
  let points = await fetchUserPoints(userId);
  if (!points) {
    const { data, error } = await supabase.from('user_points').insert({ user_id: userId, points: 0, level: 1 }).select('*').single();
    if (!error && data) points = data;
  }
  return points || { id: '', user_id: userId, points: 0, level: 1, updated_at: '' };
}

export async function awardPoints(userId: string, action: string, points: number): Promise<void> {
  const current = await ensureUserPoints(userId);
  const newPoints = current.points + points;
  const newLevel = getLevel(newPoints).level;
  await supabase.from('user_points').update({ points: newPoints, level: newLevel, updated_at: new Date().toISOString() }).eq('user_id', userId);
  await supabase.from('points_history').insert({ user_id: userId, action, points });
  await checkAndAwardBadges(userId, newPoints);
}

export async function fetchPointsHistory(userId: string, limit = 50): Promise<PointsHistory[]> {
  const { data, error } = await supabase.from('points_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data;
}

export async function fetchUserBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase.from('user_badges').select('*').eq('user_id', userId);
  if (error || !data) return [];
  return data;
}

export const BADGE_CRITERIA: Record<string, { description: string; check: (points: number, counts: { posts: number; followers: number }) => boolean }> = {
  'Early Adopter': { description: 'Joined Sangam early', check: () => true },
  'Top Creator': { description: 'Created 10+ posts', check: (_p, c) => c.posts >= 10 },
  'Social Butterfly': { description: 'Got 50+ followers', check: (_p, c) => c.followers >= 50 },
  'Trendsetter': { description: 'Earned 500+ points', check: (p) => p >= 500 },
  'Verified Creator': { description: 'Earned 2000+ points', check: (p) => p >= 2000 },
};

export async function checkAndAwardBadges(userId: string, points: number): Promise<void> {
  const { count: postCount } = await supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  const { count: followerCount } = await supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId);
  const counts = { posts: postCount || 0, followers: followerCount || 0 };
  for (const [badgeType, criteria] of Object.entries(BADGE_CRITERIA)) {
    if (criteria.check(points, counts)) {
      const { data: existing } = await supabase.from('user_badges').select('id').eq('user_id', userId).eq('badge_type', badgeType).maybeSingle();
      if (!existing) {
        await supabase.from('user_badges').insert({ user_id: userId, badge_type: badgeType });
      }
    }
  }
}

export async function fetchLeaderboard(limit = 20): Promise<{ profile: Profile; points: number; level: number }[]> {
  const { data, error } = await supabase.from('user_points').select('user_id, points, level').order('points', { ascending: false }).limit(limit);
  if (error || !data) return [];
  const userIds = data.map((d) => d.user_id);
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));
  return data.map((d) => ({ profile: profileMap.get(d.user_id)!, points: d.points, level: d.level })).filter((d) => d.profile);
}
