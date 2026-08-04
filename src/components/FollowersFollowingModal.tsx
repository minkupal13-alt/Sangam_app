import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, BadgeCheck, Loader2, UserPlus, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import type { Profile } from '@/lib/types';

interface FollowersFollowingModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  mode: 'followers' | 'following';
}

export default function FollowersFollowingModal({
  open,
  onClose,
  userId,
  mode,
}: FollowersFollowingModalProps) {
  const navigate = useNavigate();
  const myProfile = useAuthStore((s) => s.profile);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let rows: { follower_id: string; following_id: string }[] = [];
        if (mode === 'followers') {
          const { data } = await supabase
            .from('follows')
            .select('follower_id, following_id')
            .eq('following_id', userId);
          rows = data || [];
        } else {
          const { data } = await supabase
            .from('follows')
            .select('follower_id, following_id')
            .eq('follower_id', userId);
          rows = data || [];
        }
        const targetIds = rows.map((r) => (mode === 'followers' ? r.follower_id : r.following_id));
        if (targetIds.length === 0) {
          if (!cancelled) setUsers([]);
          setLoading(false);
          return;
        }
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', targetIds);
        if (!cancelled) setUsers((profiles || []) as Profile[]);

        // Load who I follow
        if (myProfile) {
          const { data: myFollows } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', myProfile.id);
          if (!cancelled) setFollowingIds(new Set((myFollows || []).map((f) => f.following_id)));
        }
      } catch {
        if (!cancelled) setUsers([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId, mode, myProfile]);

  if (!open) return null;

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleToggleFollow(targetId: string) {
    if (!myProfile) return;
    const isFollowing = followingIds.has(targetId);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', myProfile.id).eq('following_id', targetId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    } else {
      await supabase.from('follows').insert({ follower_id: myProfile.id, following_id: targetId });
      setFollowingIds((prev) => new Set(prev).add(targetId));
    }
  }

  function handleClose() {
    setSearch('');
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-md h-[70vh] flex flex-col bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 dark:border-navy-300 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300">
          <button
            onClick={handleClose}
            className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="font-heading font-bold text-gray-900 dark:text-white capitalize">{mode}</h2>
          <div className="w-8" />
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-100 dark:border-navy-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${mode}...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 dark:bg-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">
              {search ? 'No users match your search' : `No ${mode} yet`}
            </p>
          ) : (
            filtered.map((u) => {
              const isMe = myProfile?.id === u.id;
              const isFollowing = followingIds.has(u.id);
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors"
                >
                  <img
                    src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.full_name}`}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover flex-shrink-0 cursor-pointer"
                    onClick={() => {
                      handleClose();
                      navigate(`/u/${u.username}`);
                    }}
                  />
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      handleClose();
                      navigate(`/u/${u.username}`);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                        {u.full_name}
                      </span>
                      {u.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />}
                    </div>
                    <p className="text-gray-400 text-xs truncate">@{u.username}</p>
                  </div>
                  {!isMe && (
                    <button
                      onClick={() => handleToggleFollow(u.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                        isFollowing
                          ? 'border border-gray-300 dark:border-navy-50 text-gray-600 dark:text-gray-300'
                          : 'bg-sangam-gradient text-white'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="h-3 w-3" /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3" /> Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
