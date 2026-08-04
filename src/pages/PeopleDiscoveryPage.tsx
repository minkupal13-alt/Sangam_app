import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BadgeCheck, Users, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import type { Profile } from '@/lib/types';
import { fetchPeopleSuggestions, fetchTrendingCreators } from '@/lib/searchApi';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { formatCount } from '@/lib/format';
import { usePageTitle } from '@/lib/usePageTitle';

export default function PeopleDiscoveryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  usePageTitle(`${t('explore.discoverPeople')} | Sangam`);
  const [suggestions, setSuggestions] = useState<(Profile & { mutual_count?: number })[]>([]);
  const [creators, setCreators] = useState<Profile[]>([]);
  const [newUsers, setNewUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const [sugs, trendCreators] = await Promise.all([
      fetchPeopleSuggestions(),
      fetchTrendingCreators(),
    ]);
    setSuggestions(sugs);
    setCreators(trendCreators);

    // Fetch new users (joined in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('profiles')
      .select('*')
      .gt('created_at', sevenDaysAgo)
      .neq('id', profile?.id || '')
      .order('created_at', { ascending: false })
      .limit(10);
    setNewUsers((recent || []) as Profile[]);

    if (profile) {
      const { data: myFollowing } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', profile.id);
      setFollowingIds(new Set((myFollowing || []).map((f) => f.following_id)));
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  async function handleFollow(userId: string) {
    if (!profile) return;
    await supabase.from('follows').insert({ follower_id: profile.id, following_id: userId });
    setFollowingIds((prev) => new Set([...prev, userId]));
  }

  async function handleUnfollow(userId: string) {
    if (!profile) return;
    await supabase.from('follows').delete().eq('follower_id', profile.id).eq('following_id', userId);
    setFollowingIds((prev) => { const n = new Set(prev); n.delete(userId); return n; });
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate('/explore')} className="h-9 w-9 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">{t('explore.discoverPeople')}</h1>
      </div>

      {loading ? (
        <div className="space-y-4 px-4 py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="h-12 w-12 rounded-full skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded skeleton" />
                <div className="h-3 w-1/2 rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-4">
          {/* People you might know */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-brand-500" />
              <h2 className="font-heading font-bold text-base text-gray-900 dark:text-white">{t('search.peopleYouMayKnow')}</h2>
            </div>
            {suggestions.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">{t('search.noSuggestionsAvailable')}</p>
            ) : (
              <div className="space-y-2">
                {suggestions.map((u) => (
                  <UserCard
                    key={u.id}
                    user={u}
                    isFollowing={followingIds.has(u.id)}
                    mutualCount={u.mutual_count}
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                    onClick={() => navigate(`/u/${u.username}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Trending creators */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-coral-500" />
              <h2 className="font-heading font-bold text-base text-gray-900 dark:text-white">{t('search.trendingCreators')}</h2>
            </div>
            {creators.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">{t('search.noTrendingCreators')}</p>
            ) : (
              <div className="space-y-2">
                {creators.map((u, i) => (
                  <UserCard
                    key={u.id}
                    user={u}
                    isFollowing={followingIds.has(u.id)}
                    rank={i + 1}
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                    onClick={() => navigate(`/u/${u.username}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* New on Sangam */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="font-heading font-bold text-base text-gray-900 dark:text-white">{t('search.newOnSangam')}</h2>
            </div>
            {newUsers.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">{t('search.noNewUsers')}</p>
            ) : (
              <div className="space-y-2">
                {newUsers.map((u) => (
                  <UserCard
                    key={u.id}
                    user={u}
                    isFollowing={followingIds.has(u.id)}
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                    onClick={() => navigate(`/u/${u.username}`)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function UserCard({
  user,
  isFollowing,
  mutualCount,
  rank,
  onFollow,
  onUnfollow,
  onClick,
}: {
  user: Profile;
  isFollowing: boolean;
  mutualCount?: number;
  rank?: number;
  onFollow: (id: string) => void;
  onUnfollow: (id: string) => void;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300">
      {rank && (
        <span className="text-lg font-bold text-gray-300 dark:text-navy-300 w-6 text-center flex-shrink-0">{rank}</span>
      )}
      <img
        src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name}`}
        alt=""
        onClick={onClick}
        className="h-12 w-12 rounded-full object-cover cursor-pointer flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span onClick={onClick} className="text-sm font-bold text-gray-900 dark:text-white cursor-pointer hover:underline truncate">
            {user.full_name}
          </span>
          {user.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />}
        </div>
        <p className="text-xs text-gray-400 truncate">@{user.username}</p>
        {user.bio && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{user.bio}</p>}
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-400">{formatCount(user.followers_count)} {t('search.followers')}</span>
          {mutualCount !== undefined && mutualCount > 0 && (
            <span className="text-xs text-brand-500">{formatCount(mutualCount)} {t('search.mutualConnections')}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => (isFollowing ? onUnfollow(user.id) : onFollow(user.id))}
        className={`px-4 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-transform flex-shrink-0 ${
          isFollowing
            ? 'bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300'
            : 'bg-sangam-gradient text-white shadow-sm shadow-coral-500/20'
        }`}
      >
        {isFollowing ? t('explore.following') : t('explore.follow')}
      </button>
    </div>
  );
}
