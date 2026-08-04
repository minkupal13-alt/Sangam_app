import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  UserPlus,
  AtSign,
  Send,
  Repeat2,
  Bell,
  BadgeCheck,
  Settings,
  Loader2,
} from 'lucide-react';
import type { Notification, Post } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import {
  fetchNotifications,
  markAllNotificationsRead,
  timeAgoHindi,
  fetchNotificationPostThumbnail,
} from '@/lib/notificationApi';
import { usePageTitle } from '@/lib/usePageTitle';

export default function NotificationsPage() {
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'mentions'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [postThumbs, setPostThumbs] = useState<Map<string, string>>(new Map());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  usePageTitle('Pulse | Sangam');

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const notifs = await fetchNotifications(tab);
    setNotifications(notifs);

    // Fetch post thumbnails
    const postIds = [
      ...new Set(
        notifs
          .filter((n) => n.target_type === 'post' && n.target_id)
          .map((n) => n.target_id as string),
      ),
    ];
    const thumbs = new Map<string, string>();
    for (const pid of postIds) {
      const url = await fetchNotificationPostThumbnail(pid);
      if (url) thumbs.set(pid, url);
    }
    setPostThumbs(thumbs);

    // Fetch who I follow (for follow-back button)
    const { data: myFollowing } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', profile.id);
    setFollowingIds(new Set((myFollowing || []).map((f) => f.following_id)));

    // Mark all as read
    await markAllNotificationsRead();
    setLoading(false);
  }, [profile, tab]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: new notifications
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        async (payload) => {
          const n = payload.new as Notification;
          const { data: actor } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', n.from_user_id)
            .maybeSingle();
          setNotifications((prev) => {
            if (prev.some((p) => p.id === n.id)) return prev;
            return [{ ...n, actor: actor as Notification['actor'] }, ...prev];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const newNotifs = notifications.filter((n) => !n.is_read);
  const earlierNotifs = notifications.filter((n) => n.is_read);

  function handleNotifClick(n: Notification) {
    if (n.type === 'message' && n.target_id) {
      navigate(`/chats/${n.target_id}`);
    } else if (n.type === 'follow' && n.actor) {
      navigate(`/u/${n.actor.username}`);
    } else if (n.target_type === 'post' && n.target_id) {
      navigate(`/u/${n.actor?.username || ''}`);
    } else if (n.actor) {
      navigate(`/u/${n.actor.username}`);
    }
  }

  async function handleFollowBack(userId: string) {
    if (!profile) return;
    await supabase.from('follows').insert({ follower_id: profile.id, following_id: userId });
    setFollowingIds((prev) => new Set([...prev, userId]));
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Pulse</h1>
        <button
          onClick={() => navigate('/settings/notifications')}
          className="h-9 w-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-navy-200 transition-colors"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-[#fafaf9]/80 dark:bg-[#0b1220]/80 backdrop-blur-xl z-10">
        <TabButton active={tab === 'all'} onClick={() => setTab('all')} label="All" />
        <TabButton active={tab === 'mentions'} onClick={() => setTab('mentions')} label="Mentions" />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2 px-4 py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="h-11 w-11 rounded-full skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 rounded skeleton" />
                <div className="h-3 w-3/4 rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-brand-500" />
          </div>
          <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">Sab caught up!</p>
          <p className="text-gray-400 text-sm mt-1">No new notifications. You're all caught up.</p>
        </div>
      ) : (
        <div>
          {/* New section */}
          {newNotifs.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wide">New</p>
              {newNotifs.map((n) => (
                <NotifRow
                  key={n.id}
                  n={n}
                  postThumbs={postThumbs}
                  followingIds={followingIds}
                  onClick={() => handleNotifClick(n)}
                  onFollowBack={handleFollowBack}
                  unread
                />
              ))}
            </div>
          )}
          {/* Earlier section */}
          {earlierNotifs.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wide">Earlier</p>
              {earlierNotifs.map((n) => (
                <NotifRow
                  key={n.id}
                  n={n}
                  postThumbs={postThumbs}
                  followingIds={followingIds}
                  onClick={() => handleNotifClick(n)}
                  onFollowBack={handleFollowBack}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-semibold relative transition-colors ${
        active ? 'text-gray-900 dark:text-white' : 'text-gray-400'
      }`}
    >
      {label}
      {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-12 rounded-full bg-sangam-gradient" />}
    </button>
  );
}

function NotifRow({
  n,
  postThumbs,
  followingIds,
  onClick,
  onFollowBack,
  unread,
}: {
  n: Notification;
  postThumbs: Map<string, string>;
  followingIds: Set<string>;
  onClick: () => void;
  onFollowBack: (userId: string) => void;
  unread?: boolean;
}) {
  const icon = getIcon(n.type);
  const text = getText(n);
  const thumb = n.target_id ? postThumbs.get(n.target_id) : null;
  const showFollowBack = n.type === 'follow' && n.actor && !followingIds.has(n.actor.id);

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-navy-200/50 ${
        unread ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''
      }`}
    >
      {/* Icon */}
      <div className="mt-0.5 flex-shrink-0">
        {icon}
      </div>
      {/* Avatar */}
      {n.actor && (
        <img
          src={n.actor.avatar_url || `https://ui-avatars.com/api/?name=${n.actor.full_name}`}
          alt=""
          className="h-9 w-9 rounded-full object-cover flex-shrink-0"
        />
      )}
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-bold text-sm text-gray-900 dark:text-white">{n.actor?.full_name}</span>
          {n.actor?.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{text}</p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgoHindi(n.created_at)}</p>
        {/* Follow back button */}
        {showFollowBack && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFollowBack(n.actor!.id);
            }}
            className="mt-2 px-4 py-1.5 rounded-full bg-sangam-gradient text-white text-xs font-bold active:scale-95 transition-transform shadow-sm shadow-coral-500/20"
          >
            Follow Back
          </button>
        )}
      </div>
      {/* Post thumbnail */}
      {thumb && (
        <img src={thumb} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
      )}
    </div>
  );
}

function getIcon(type: string) {
  const className = "h-6 w-6";
  switch (type) {
    case 'like':
      return <Heart className={`${className} fill-coral-500 text-coral-500`} />;
    case 'comment':
      return <MessageCircle className={`${className} text-brand-500`} />;
    case 'follow':
      return <UserPlus className={`${className} text-brand-500`} />;
    case 'mention':
      return <AtSign className={`${className} text-green-500`} />;
    case 'message':
      return <Send className={`${className} text-brand-500`} />;
    case 'echo':
      return <Repeat2 className={`${className} text-coral-500`} />;
    default:
      return <Bell className={`${className} text-gray-400`} />;
  }
}

function getText(n: Notification): string {
  switch (n.type) {
    case 'like':
      return 'ने आपकी post like की';
    case 'comment':
      return `ने comment किया: "${n.preview_text || ''}"`;
    case 'follow':
      return 'ने आपको follow करना शुरू किया';
    case 'mention':
      return 'ने आपको mention किया';
    case 'message':
      return 'ने आपको message भेजा';
    case 'echo':
      return 'ने आपकी post echo की';
    default:
      return '';
  }
}
