import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus, Check, Users } from 'lucide-react';
import type { Profile } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';

interface PeopleYouMayKnowProps {
  suggestions: { profile: Profile; mutualCount: number }[];
  loading: boolean;
}

export default function PeopleYouMayKnow({ suggestions, loading }: PeopleYouMayKnowProps) {
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.profile?.id);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());

  const visible = suggestions.filter((s) => !dismissed.has(s.profile.id));
  if (!loading && visible.length === 0) return null;

  function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  async function toggleFollow(profileId: string) {
    if (!currentUserId) return;
    if (following.has(profileId)) return;
    setFollowing((prev) => new Set([...prev, profileId]));
    await supabase
      .from('follows')
      .insert({ follower_id: currentUserId, following_id: profileId });
  }

  return (
    <div className="px-4 py-3 bg-brand-50/30 dark:bg-brand-900/5 border-y border-brand-100 dark:border-brand-900/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-extrabold text-base text-gray-900 dark:text-white">
          People You May Know
        </h2>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44 h-36 rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {visible.map(({ profile, mutualCount }) => (
            <div
              key={profile.id}
              className="flex-shrink-0 w-44 bg-white dark:bg-navy-200 rounded-2xl border border-gray-100 dark:border-navy-300 p-3 relative shadow-sm"
            >
              <button
                onClick={() => dismiss(profile.id)}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="flex flex-col items-center text-center">
                <img
                  src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}`}
                  alt=""
                  onClick={() => navigate(`/u/${profile.username}`)}
                  className="h-16 w-16 rounded-full object-cover cursor-pointer mb-2"
                />
                <p
                  onClick={() => navigate(`/u/${profile.username}`)}
                  className="font-semibold text-sm text-gray-900 dark:text-white cursor-pointer hover:underline truncate max-w-full"
                >
                  {profile.full_name}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Users className="h-3 w-3" />
                  {mutualCount > 0 ? `${mutualCount} mutual` : `${profile.followers_count} followers`}
                </p>
                <button
                  onClick={() => toggleFollow(profile.id)}
                  className={`mt-2.5 w-full py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                    following.has(profile.id)
                      ? 'bg-gray-200 dark:bg-navy-300 text-gray-500'
                      : 'bg-sangam-gradient text-white shadow-sm shadow-coral-500/20'
                  }`}
                >
                  {following.has(profile.id) ? (
                    <span className="flex items-center justify-center gap-1">
                      <Check className="h-3 w-3" /> Following
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      <UserPlus className="h-3 w-3" /> Follow
                    </span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
