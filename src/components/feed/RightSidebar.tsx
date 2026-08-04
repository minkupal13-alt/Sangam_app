import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Check, TrendingUp, Hash, Eye, Sparkles, Mic, CalendarDays, Award, ChevronRight } from 'lucide-react';
import type { Profile, Video } from '@/lib/types';
import {
  fetchSuggestedUsers,
  fetchTrendingTopics,
  fetchTrendingVideos,
  fetchSangamPoints,
  fetchLiveRooms,
  fetchUpcomingEvents,
  type LiveRoom,
  type EventItem,
} from '@/lib/feedMixApi';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { formatCount, timeAgo } from '@/lib/format';

export default function RightSidebar() {
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const [suggested, setSuggested] = useState<{ profile: Profile; mutualCount: number }[]>([]);
  const [topics, setTopics] = useState<{ tag: string; count: number }[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [points, setPoints] = useState<{ points: number; level: number; nextLevel: number } | null>(null);
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      const [users, tps, vids, pts, rooms, events] = await Promise.all([
        fetchSuggestedUsers(profile.id, 4),
        fetchTrendingTopics(5),
        fetchTrendingVideos(3),
        fetchSangamPoints(profile.id),
        fetchLiveRooms(3),
        fetchUpcomingEvents(2),
      ]);
      if (!active) return;
      setSuggested(users);
      setTopics(tps);
      setVideos(vids);
      setPoints(pts);
      setRooms(rooms);
      setEvents(events);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [profile]);

  async function handleFollow(profileId: string) {
    if (!profile || following.has(profileId)) return;
    setFollowing((prev) => new Set([...prev, profileId]));
    await supabase.from('follows').insert({
      follower_id: profile.id,
      following_id: profileId,
    });
  }

  if (!profile) return null;

  const pointsProgress = points ? Math.min(100, (points.points / points.nextLevel) * 100) : 0;

  return (
    <aside className="hidden xl:flex flex-col w-72 flex-shrink-0 sticky top-0 h-screen overflow-y-auto no-scrollbar py-4 pl-4">
      {/* Sangam Points */}
      {points && (
        <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-br from-brand-50 to-coral-50 dark:from-navy-200 dark:to-navy-300 border border-brand-100 dark:border-navy-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-sangam-gradient flex items-center justify-center">
              <Award className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Sangam Points</p>
              <p className="text-[10px] text-gray-400">Level {points.level}</p>
            </div>
            <span className="ml-auto text-lg font-extrabold text-sangam-gradient">{formatCount(points.points)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 dark:bg-navy-400 overflow-hidden">
            <div className="h-full rounded-full bg-sangam-gradient transition-all" style={{ width: `${pointsProgress}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{points.nextLevel - points.points} pts to Level {points.level + 1}</p>
        </div>
      )}

      {/* Trending Topics */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-coral-500" />
          <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white">Trending Topics</h3>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 rounded skeleton" />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {topics.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => navigate(`/hashtag/${tag}`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-200 transition-colors text-left"
              >
                <Hash className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">{tag}</span>
                <span className="text-xs text-gray-400">{formatCount(count)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Suggested People */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white">Suggested People</h3>
          <button onClick={() => navigate('/explore/people')} className="text-xs text-brand-500 hover:underline">
            See All
          </button>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg skeleton" />
            ))}
          </div>
        ) : suggested.length === 0 ? (
          <p className="text-xs text-gray-400">No suggestions</p>
        ) : (
          <div className="space-y-2">
            {suggested.map(({ profile: p, mutualCount }) => (
              <div key={p.id} className="flex items-center gap-2.5">
                <img
                  src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}`}
                  alt=""
                  onClick={() => navigate(`/u/${p.username}`)}
                  className="h-9 w-9 rounded-full object-cover cursor-pointer flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p
                    onClick={() => navigate(`/u/${p.username}`)}
                    className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:underline truncate"
                  >
                    {p.full_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {mutualCount > 0 ? `${mutualCount} mutual` : `${formatCount(p.followers_count)} followers`}
                  </p>
                </div>
                <button
                  onClick={() => handleFollow(p.id)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95 ${
                    following.has(p.id) ? 'bg-gray-200 dark:bg-navy-300 text-gray-500' : 'bg-sangam-gradient text-white'
                  }`}
                >
                  {following.has(p.id) ? <Check className="h-3 w-3" /> : <><UserPlus className="h-3 w-3" /> Follow</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Events (compact) */}
      {events.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-emerald-500" />
            <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white">Upcoming Events</h3>
          </div>
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => navigate('/explore')}
                className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-200 rounded-lg p-1.5 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex flex-col items-center justify-center">
                  <span className="text-[9px] font-bold text-emerald-500">{event.date.split(' ')[0]}</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{event.date.split(' ')[1]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{event.title}</p>
                  <p className="text-[10px] text-gray-400">{event.time} · {event.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Audio Rooms */}
      {rooms.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Mic className="h-4 w-4 text-purple-500" />
            <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white">Active Rooms</h3>
          </div>
          <div className="space-y-2">
            {rooms.slice(0, 2).map((room) => (
              <div
                key={room.id}
                onClick={() => navigate('/explore')}
                className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-200 rounded-lg p-1.5 transition-colors"
              >
                <img
                  src={room.host_avatar || `https://ui-avatars.com/api/?name=${room.host_name}`}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{room.title}</p>
                  <p className="text-[10px] text-purple-500 font-medium">{room.listener_count} listening</p>
                </div>
                <button className="px-2 py-1 rounded-full bg-sangam-gradient text-white text-[10px] font-bold active:scale-95 transition-transform">
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending on Watch */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white">Trending on Watch</h3>
          <button onClick={() => navigate('/watch')} className="text-xs text-brand-500 hover:underline">
            See All
          </button>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg skeleton" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map((v) => (
              <div
                key={v.id}
                onClick={() => navigate(`/watch/${v.id}`)}
                className="flex gap-2 cursor-pointer group"
              >
                <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-navy-300 flex-shrink-0">
                  {v.thumbnail_url && (
                    <img
                      src={v.thumbnail_url}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">{v.title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatCount(v.views_count)} views · {timeAgo(v.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-100 dark:border-navy-300">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
          <button className="hover:text-gray-600 dark:hover:text-gray-300">About</button>
          <button className="hover:text-gray-600 dark:hover:text-gray-300">Privacy</button>
          <button className="hover:text-gray-600 dark:hover:text-gray-300">Help</button>
          <button className="hover:text-gray-600 dark:hover:text-gray-300">Terms</button>
          <button className="hover:text-gray-600 dark:hover:text-gray-300">Cookies</button>
        </div>
        <p className="text-xs text-gray-300 dark:text-gray-500 mt-2">© 2026 Sangam</p>
      </div>
    </aside>
  );
}
