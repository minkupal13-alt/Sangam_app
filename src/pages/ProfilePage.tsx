import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck, Settings, Loader2, Grid3x3, Film, Image as ImageIcon,
  Bookmark, MessageCircle, Calendar, Link as LinkIcon, MapPin,
  MoreHorizontal, QrCode, Share2, UserPlus, UserCheck, Camera,
  Heart, Play, ShoppingBag, Plus, Crown, Coins, Gift, Tag,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { fetchPosts, fetchSavedPosts, toggleLike, toggleBookmark } from '@/lib/feedApi';
import {
  fetchBioLinks, fetchHighlights, fetchUserPoints, fetchCreatorMonetization,
  fetchBookmarkCollections, fetchMarketplaceListings, fetchFlicksByUser, fetchVideosByUser,
  getLevelInfo,
} from '@/lib/profileUtils';
import PostCard from '@/components/PostCard';
import CommentSheet from '@/components/CommentSheet';
import ShareSheet from '@/components/ShareSheet';
import EditProfileModal from '@/components/EditProfileModal';
import FollowersFollowingModal from '@/components/FollowersFollowingModal';
import QRCodeModal from '@/components/QRCodeModal';
import LogoutConfirmModal from '@/components/LogoutConfirmModal';
import type { Profile, Post, BioLink, StoryHighlight, BookmarkCollection } from '@/lib/types';
import { formatCount, timeAgo } from '@/lib/format';
import { usePageTitle } from '@/lib/usePageTitle';

type ProfileTab = 'posts' | 'flicks' | 'videos' | 'photos' | 'tagged' | 'saved' | 'shop';

interface FlickItem { id: string; video_url: string; thumbnail_url: string | null; views_count: number; caption: string; }
interface VideoItem { id: string; title: string; thumbnail_url: string | null; video_url: string; duration: number; views_count: number; }
interface ListingItem { id: string; title: string; price: number; condition: string; images: string[]; }

export default function ProfilePage() {
  const { t } = useTranslation();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const myProfile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [profile, setProfile] = useState<Profile | null>(null);
  usePageTitle(profile ? `${profile.full_name} | Sangam` : 'Profile | Sangam');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [error, setError] = useState('');
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [listModal, setListModal] = useState<{ open: boolean; mode: 'followers' | 'following' }>({ open: false, mode: 'followers' });
  const [showFollowMenu, setShowFollowMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showOwnMenu, setShowOwnMenu] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [bioLinks, setBioLinks] = useState<BioLink[]>([]);
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [points, setPoints] = useState({ points: 0, level: 1 });
  const [monetization, setMonetization] = useState<{ is_enabled: boolean; subscription_enabled: boolean; subscription_price: number | null } | null>(null);
  const [collections, setCollections] = useState<BookmarkCollection[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [flicks, setFlicks] = useState<FlickItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  const isOwn = myProfile && profile && myProfile.id === profile.id;

  const loadProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();
      if (err) throw err;
      if (!data) { setError('User not found'); setProfile(null); setLoading(false); return; }
      setProfile(data as Profile);

      // Check follow status
      if (myProfile && myProfile.id !== data.id) {
        const { data: follow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', myProfile.id)
          .eq('following_id', data.id)
          .maybeSingle();
        setIsFollowing(!!follow);
      }

      // Load posts
      const { data: userPosts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', data.id)
        .order('created_at', { ascending: false })
        .limit(50);
      const postIds = (userPosts || []).map((p: { id: string }) => p.id);
      const repostOfIds = (userPosts || []).filter((p: { repost_of?: string | null }) => p.repost_of).map((p: { repost_of: string }) => p.repost_of as string);
      let originalPostsMap = new Map<string, Post>();
      if (repostOfIds.length > 0) {
        const { data: originals } = await supabase.from('posts').select('*').in('id', repostOfIds);
        const originalUserIds = [...new Set((originals || []).map((o: { user_id: string }) => o.user_id))];
        const { data: originalProfiles } = await supabase.from('profiles').select('*').in('id', originalUserIds);
        const profMap = new Map<string, Profile>();
        (originalProfiles || []).forEach((p: Profile) => profMap.set(p.id, p));
        (originals || []).forEach((o: Post) => { originalPostsMap.set(o.id, { ...o, author: profMap.get(o.user_id) }); });
      }
      let likedIds = new Set<string>();
      let bookmarkedIds = new Set<string>();
      if (postIds.length > 0) {
        const { data: likes } = await supabase.from('likes').select('target_id').eq('target_type', 'post').in('target_id', postIds);
        likedIds = new Set((likes || []).map((l: { target_id: string }) => l.target_id));
        if (myProfile) {
          const { data: bms } = await supabase.from('bookmarks').select('post_id').in('post_id', postIds);
          bookmarkedIds = new Set((bms || []).map((b: { post_id: string }) => b.post_id));
        }
      }
      const userPostsData: Post[] = (userPosts || []).map((p: Post) => ({
        ...p,
        author: myProfile && p.user_id === myProfile.id ? myProfile : (data as Profile),
        liked_by_me: likedIds.has(p.id),
        bookmarked_by_me: bookmarkedIds.has(p.id),
        original_post: p.repost_of ? originalPostsMap.get(p.repost_of) || null : null,
      }));
      setPosts(userPostsData);

      // Load side data
      const [links, hls, pts, mon] = await Promise.all([
        fetchBioLinks(data.id).catch(() => []),
        fetchHighlights(data.id).catch(() => []),
        fetchUserPoints(data.id).catch(() => ({ points: 0, level: 1 })),
        fetchCreatorMonetization(data.id).catch(() => null),
      ]);
      setBioLinks(links as BioLink[]);
      setHighlights(hls as StoryHighlight[]);
      setPoints(pts as { points: number; level: number });
      setMonetization(mon as { is_enabled: boolean; subscription_enabled: boolean; subscription_price: number | null } | null);

      if (myProfile && myProfile.id === data.id) {
        const saved = await fetchSavedPosts(data.id);
        setSavedPosts(saved);
        const [cols, lsts] = await Promise.all([
          fetchBookmarkCollections(data.id).catch(() => []),
          fetchMarketplaceListings(data.id).catch(() => []),
        ]);
        setCollections(cols as BookmarkCollection[]);
        setListings(lsts as ListingItem[]);
      }
    } catch {
      setError('Failed to load profile');
    }
    setLoading(false);
  }, [username, myProfile]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Load tab-specific data
  useEffect(() => {
    if (!profile) return;
    if (tab === 'flicks' && flicks.length === 0) {
      setTabLoading(true);
      fetchFlicksByUser(profile.id, 20).then((f) => setFlicks(f as FlickItem[])).catch(() => {}).finally(() => setTabLoading(false));
    }
    if (tab === 'videos' && videos.length === 0) {
      setTabLoading(true);
      fetchVideosByUser(profile.id, 20).then((v) => setVideos(v as VideoItem[])).catch(() => {}).finally(() => setTabLoading(false));
    }
  }, [tab, profile]);

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) { setShowMoreMenu(false); setShowFollowMenu(false); setShowOwnMenu(false); }
    }
    if (showMoreMenu || showFollowMenu || showOwnMenu) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showMoreMenu, showFollowMenu, showOwnMenu]);

  async function handleFollow() {
    if (!myProfile || !profile) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', myProfile.id).eq('following_id', profile.id);
      setIsFollowing(false);
      setProfile({ ...profile, followers_count: Math.max(0, profile.followers_count - 1) });
    } else {
      await supabase.from('follows').insert({ follower_id: myProfile.id, following_id: profile.id });
      setIsFollowing(true);
      setProfile({ ...profile, followers_count: profile.followers_count + 1 });
    }
  }

  function handleLike(post: Post) {
    const updater = (list: Post[]) => list.map((p) => p.id === post.id ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.likes_count + (p.liked_by_me ? -1 : 1) } : p);
    setPosts(updater); setSavedPosts(updater);
    toggleLike(post.id, post.liked_by_me || false).catch(() => loadProfile());
  }

  function handleBookmark(post: Post) {
    const updater = (list: Post[]) => list.map((p) => p.id === post.id ? { ...p, bookmarked_by_me: !p.bookmarked_by_me } : p);
    setPosts(updater); setSavedPosts(updater);
    toggleBookmark(post.id, post.bookmarked_by_me || false).then(async () => { if (myProfile) { const s = await fetchSavedPosts(myProfile.id); setSavedPosts(s); } });
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/u/${profile?.username}`).catch(() => {});
    setCopied(true); setShowMoreMenu(false);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <ProfileSkeleton />;
  if (error || !profile) return <div className="text-center py-20"><p className="text-gray-400 text-lg">{error || 'Profile not found'}</p></div>;

  const photoPosts = posts.filter((p) => p.media_type === 'image' && p.media_urls.length > 0);
  const levelInfo = getLevelInfo(points.points);

  const TABS: { key: ProfileTab; icon: React.ReactNode; label: string; ownOnly?: boolean }[] = [
    { key: 'posts', icon: <Grid3x3 className="h-4 w-4" />, label: t('profile.posts') },
    { key: 'flicks', icon: <Film className="h-4 w-4" />, label: 'Flicks' },
    { key: 'videos', icon: <Play className="h-4 w-4" />, label: t('feed.trendingOnWatch') },
    { key: 'photos', icon: <ImageIcon className="h-4 w-4" />, label: t('profile.noPhotosYet').replace('No ', '').replace('yet', '').trim() || 'Photos' },
    { key: 'tagged', icon: <Tag className="h-4 w-4" />, label: t('profile.tagged') },
    { key: 'saved', icon: <Bookmark className="h-4 w-4" />, label: t('profile.saved'), ownOnly: true },
    { key: 'shop', icon: <ShoppingBag className="h-4 w-4" />, label: t('profile.shop') },
  ];
  const visibleTabs = TABS.filter((tb) => !tb.ownOnly || isOwn);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Cover */}
      <div className="relative h-40 sm:h-56 bg-sangam-gradient overflow-hidden">
        {profile.cover_url && <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {isOwn && (
          <label className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center cursor-pointer">
            <Camera className="h-4 w-4 text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file || !profile) return;
              const ext = file.name.split('.').pop();
              const path = `${profile.id}-${Date.now()}.${ext}`;
              const { error: upErr } = await supabase.storage.from('covers').upload(path, file, { upsert: true, contentType: file.type });
              if (upErr) return;
              const { data } = supabase.storage.from('covers').getPublicUrl(path);
              await supabase.from('profiles').update({ cover_url: data.publicUrl }).eq('id', profile.id);
              loadProfile();
            }} />
          </label>
        )}
      </div>

      <div className="px-4 -mt-12 sm:-mt-14">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div className="relative">
            <img
              src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}`}
              alt=""
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border-4 border-white dark:border-[#0b1220]"
            />
            {isOwn && (
              <label className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-sangam-gradient flex items-center justify-center cursor-pointer border-2 border-white dark:border-[#0b1220]">
                <Camera className="h-4 w-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file || !profile) return;
                  const ext = file.name.split('.').pop();
                  const path = `${profile.id}-${Date.now()}.${ext}`;
                  const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
                  if (upErr) return;
                  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
                  await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
                  loadProfile();
                }} />
              </label>
            )}
            <span className="absolute bottom-1 left-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0b1220]" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isOwn ? (
              <>
                <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-300 dark:border-navy-50 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-navy-300 transition-colors">
                  <Settings className="h-4 w-4" /> {t('profile.editProfile')}
                </button>
                <button onClick={() => setQrOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-300 dark:border-navy-50 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-navy-300 transition-colors">
                  <QrCode className="h-4 w-4" /> {t('profile.qrCode')}
                </button>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/u/${profile.username}`).catch(() => {}); }} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-300 dark:border-navy-50 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-navy-300 transition-colors">
                  <Share2 className="h-4 w-4" /> {t('profile.shareProfile')}
                </button>
                <div className="relative" ref={moreMenuRef}>
                  <button onClick={() => setShowOwnMenu((v) => !v)} aria-label="More options" className="h-9 w-9 rounded-full border border-gray-300 dark:border-navy-50 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {showOwnMenu && (
                    <div className="absolute top-full mt-1 right-0 w-44 rounded-xl bg-white dark:bg-navy-200 shadow-xl border border-gray-100 dark:border-navy-300 py-1 z-30 animate-scaleIn">
                      <MoreMenuItem label="Settings" onClick={() => { setShowOwnMenu(false); navigate('/settings'); }} />
                      <MoreMenuItem label="Logout" onClick={() => { setShowOwnMenu(false); setLogoutOpen(true); }} danger />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/chats')} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-300 dark:border-navy-50 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-navy-300 transition-colors">
                  <MessageCircle className="h-4 w-4" /> {t('profile.message')}
                </button>
                <div className="relative">
                  <button
                    onClick={() => isFollowing ? setShowFollowMenu((v) => !v) : handleFollow()}
                    className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${
                      isFollowing ? 'border border-gray-300 dark:border-navy-50 text-gray-700 dark:text-gray-300' : 'bg-sangam-gradient text-white shadow-md shadow-coral-500/20'
                    }`}
                  >
                    {isFollowing ? <><UserCheck className="h-4 w-4" /> {t('profile.following')}</> : <><UserPlus className="h-4 w-4" /> {t('profile.follow')}</>}
                  </button>
                  {showFollowMenu && (
                    <div className="absolute top-full mt-1 right-0 w-40 rounded-xl bg-white dark:bg-navy-200 shadow-xl border border-gray-100 dark:border-navy-300 py-1 z-30 animate-scaleIn">
                      <button onClick={() => { handleFollow(); setShowFollowMenu(false); }} className="w-full px-3 py-2 text-sm text-start text-coral-500 hover:bg-coral-50 dark:hover:bg-coral-500/10">
                        {t('profile.unfollow')}
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative" ref={moreMenuRef}>
                  <button onClick={() => setShowMoreMenu((v) => !v)} className="h-9 w-9 rounded-full border border-gray-300 dark:border-navy-50 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute top-full mt-1 right-0 w-44 rounded-xl bg-white dark:bg-navy-200 shadow-xl border border-gray-100 dark:border-navy-300 py-1 z-30 animate-scaleIn">
                      <MoreMenuItem label={copied ? '✓ Copied' : t('profile.copyProfileLink')} onClick={handleCopyLink} />
                      <MoreMenuItem label={t('profile.blockUser')} onClick={() => setShowMoreMenu(false)} danger />
                      <MoreMenuItem label={t('profile.muteUser')} onClick={() => setShowMoreMenu(false)} danger />
                      <MoreMenuItem label={t('profile.reportUser')} onClick={() => setShowMoreMenu(false)} danger />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="mt-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-gray-900 dark:text-white">{profile.full_name}</h1>
            {profile.is_verified && <BadgeCheck className="h-5 w-5 text-brand-500" />}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r ${levelInfo.bgColor} text-white capitalize`}>
              {t(`profile.${levelInfo.level}`)}
            </span>
          </div>
          <p className="text-gray-500 text-sm">@{profile.username}</p>

          {profile.bio && (
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-2 whitespace-pre-wrap line-clamp-3">{profile.bio}</p>
          )}

          {/* Info chips */}
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {profile.location}
              </span>
            )}
            {profile.website && (
              <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-500 hover:underline">
                <LinkIcon className="h-3.5 w-3.5" /> {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {t('profile.joined')} {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </span>
            {profile.birthday && (
              <span className="flex items-center gap-1">
                🎂 {new Date(profile.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </span>
            )}
          </div>

          {/* Points chip */}
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => navigate('/rewards')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
              <Coins className="h-3.5 w-3.5" /> {formatCount(points.points)} {t('profile.points')}
            </button>
            {monetization?.is_enabled && (
              <button onClick={() => navigate('/wallet')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coral-50 dark:bg-coral-900/20 text-coral-600 dark:text-coral-400 text-xs font-bold hover:bg-coral-100 transition-colors">
                <Gift className="h-3.5 w-3.5" /> {t('profile.sendTip')}
              </button>
            )}
            {monetization?.subscription_enabled && monetization.subscription_price && (
              <button onClick={() => navigate('/wallet')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-bold hover:bg-brand-100 transition-colors">
                <Crown className="h-3.5 w-3.5" /> {t('profile.subscribe')} ₹{monetization.subscription_price}{t('profile.perMonth')}
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-5 mt-3">
            <button onClick={() => setListModal({ open: true, mode: 'followers' })} className="hover:underline">
              <span className="font-bold text-gray-900 dark:text-white">{formatCount(profile.followers_count)}</span>{' '}
              <span className="text-gray-500 text-sm">{t('profile.followers')}</span>
            </button>
            <button onClick={() => setListModal({ open: true, mode: 'following' })} className="hover:underline">
              <span className="font-bold text-gray-900 dark:text-white">{formatCount(profile.following_count)}</span>{' '}
              <span className="text-gray-500 text-sm">{t('profile.followingCount')}</span>
            </button>
            <div>
              <span className="font-bold text-gray-900 dark:text-white">{formatCount(posts.length)}</span>{' '}
              <span className="text-gray-500 text-sm">{t('profile.posts')}</span>
            </div>
          </div>
        </div>

        {/* Bio Links */}
        {bioLinks.length > 0 && (
          <div className="mt-4 space-y-2">
            {bioLinks.map((link) => (
              <a
                key={link.id}
                href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <span className="text-lg">{link.emoji}</span>
                <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white truncate">{link.title}</span>
                <span className="text-gray-400 text-sm">→</span>
              </a>
            ))}
          </div>
        )}

        {/* Story Highlights */}
        <div className="mt-4">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {isOwn && (
              <button className="flex-shrink-0 flex flex-col items-center gap-1">
                <div className="h-16 w-16 rounded-full border-2 border-dashed border-gray-300 dark:border-navy-50 flex items-center justify-center text-gray-400">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-xs text-gray-500">{t('profile.newHighlight')}</span>
              </button>
            )}
            {highlights.map((hl) => (
              <button key={hl.id} className="flex-shrink-0 flex flex-col items-center gap-1">
                <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-gray-200 dark:border-navy-300">
                  {hl.cover_url ? (
                    <img src={hl.cover_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-brand-400 to-coral-400 flex items-center justify-center text-white text-xl">✨</div>
                  )}
                </div>
                <span className="text-xs text-gray-500 truncate max-w-16">{hl.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-navy-300 mt-4 overflow-x-auto no-scrollbar">
        {visibleTabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold relative transition-colors ${
              tab === tb.key ? 'text-gray-900 dark:text-white' : 'text-gray-400'
            }`}
          >
            {tb.icon}
            <span className="hidden sm:inline">{tb.label}</span>
            {tab === tb.key && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-12 rounded-full bg-sangam-gradient" />}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pb-4">
        {tab === 'posts' && (
          posts.length === 0 ? (
            <EmptyState icon={<Grid3x3 className="h-10 w-10" />} title={t('profile.noPostsYet')} subtitle={isOwn ? t('profile.shareFirstMoment') : ''} action={isOwn ? () => navigate('/') : undefined} actionLabel={isOwn ? t('profile.shareFirstMoment') : ''} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-0.5 p-0.5">
              {posts.map((p) => (
                <PostGridCard key={p.id} post={p} onClick={() => setCommentPost(p)} />
              ))}
            </div>
          )
        )}

        {tab === 'flicks' && (
          tabLoading ? <TabSkeleton /> :
          flicks.length === 0 ? (
            <EmptyState icon={<Film className="h-10 w-10" />} title={t('profile.noFlicksYet')} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-1">
              {flicks.map((f) => (
                <div key={f.id} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-200 dark:bg-navy-300 cursor-pointer group" onClick={() => navigate(`/flicks?user=${profile.username}`)}>
                  {f.thumbnail_url && <img src={f.thumbnail_url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-white text-xs font-medium">
                    <Play className="h-3 w-3" /> {formatCount(f.views_count)}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'videos' && (
          tabLoading ? <TabSkeleton /> :
          videos.length === 0 ? (
            <EmptyState icon={<Play className="h-10 w-10" />} title={t('profile.noVideosYet')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
              {videos.map((v) => (
                <div key={v.id} className="cursor-pointer group" onClick={() => navigate(`/watch/${v.id}`)}>
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-navy-300">
                    {v.thumbnail_url && <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />}
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs font-medium">
                      {Math.floor(v.duration / 60)}:{String(v.duration % 60).padStart(2, '0')}
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1.5 line-clamp-2">{v.title}</p>
                  <p className="text-xs text-gray-400">{formatCount(v.views_count)} views</p>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'photos' && (
          photoPosts.length === 0 ? (
            <EmptyState icon={<ImageIcon className="h-10 w-10" />} title={t('profile.noPhotosYet')} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-0.5 p-0.5">
              {photoPosts.map((p) => (
                <div key={p.id} className="aspect-square overflow-hidden cursor-pointer group" onClick={() => setCommentPost(p)}>
                  <img src={p.media_urls[0]} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/40 flex items-center justify-center gap-4 text-white text-sm font-bold transition-opacity">
                    <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {formatCount(p.likes_count)}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {formatCount(p.comments_count)}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'tagged' && (
          <EmptyState icon={<Tag className="h-10 w-10" />} title={t('profile.noTaggedYet')} />
        )}

        {tab === 'saved' && isOwn && (
          savedPosts.length === 0 ? (
            <EmptyState icon={<Bookmark className="h-10 w-10" />} title={t('profile.nothingSavedYet')} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-0.5 p-0.5">
              {savedPosts.map((p) => (
                <PostGridCard key={p.id} post={p} onClick={() => setCommentPost(p)} />
              ))}
            </div>
          )
        )}

        {tab === 'shop' && (
          listings.length === 0 ? (
            <EmptyState icon={<ShoppingBag className="h-10 w-10" />} title={t('profile.noListingsYet')} subtitle={isOwn ? t('profile.startSelling') : ''} action={isOwn ? () => navigate('/marketplace/create') : undefined} actionLabel={isOwn ? t('profile.addListing') : ''} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
              {listings.map((l) => (
                <div key={l.id} className="cursor-pointer group" onClick={() => navigate(`/marketplace/${l.id}`)}>
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-200 dark:bg-navy-300">
                    {l.images?.[0] && <img src={l.images[0]} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">{l.title}</p>
                  <p className="text-sm font-bold text-brand-500">₹{l.price}</p>
                  <p className="text-xs text-gray-400 capitalize">{l.condition}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {isOwn && (
        <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} profile={profile} onUpdated={async () => { await fetchProfile(); await loadProfile(); }} />
      )}
      <FollowersFollowingModal open={listModal.open} onClose={() => setListModal({ open: false, mode: listModal.mode })} userId={profile.id} mode={listModal.mode} />
      <QRCodeModal open={qrOpen} onClose={() => setQrOpen(false)} profile={profile} />
      <LogoutConfirmModal open={logoutOpen} onClose={() => setLogoutOpen(false)} />
      <CommentSheet post={commentPost} onClose={() => setCommentPost(null)} />
      <ShareSheet post={sharePost} onClose={() => setSharePost(null)} />
    </div>
  );
}

function PostGridCard({ post, onClick }: { post: Post; onClick: () => void }) {
  if (post.media_type === 'image' && post.media_urls.length > 0) {
    return (
      <div className="relative aspect-square overflow-hidden cursor-pointer group" onClick={onClick}>
        <img src={post.media_urls[0]} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
        <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/40 flex items-center justify-center gap-4 text-white text-sm font-bold transition-opacity">
          <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {formatCount(post.likes_count)}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {formatCount(post.comments_count)}</span>
        </div>
      </div>
    );
  }
  if (post.media_type === 'video' && post.media_urls.length > 0) {
    return (
      <div className="relative aspect-square overflow-hidden cursor-pointer group bg-gray-200 dark:bg-navy-300" onClick={onClick}>
        <video src={post.media_urls[0]} className="h-full w-full object-cover" muted />
        <div className="absolute top-2 right-2"><Play className="h-5 w-5 text-white" /></div>
      </div>
    );
  }
  return (
    <div className="aspect-square rounded-lg bg-gradient-to-br from-brand-400 to-coral-400 flex items-center justify-center cursor-pointer p-3 group hover:opacity-90 transition-opacity" onClick={onClick}>
      <p className="text-white text-xs font-medium line-clamp-4 text-center">{post.content || 'Post'}</p>
    </div>
  );
}

function MoreMenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full px-3 py-2 text-sm text-start transition-colors ${danger ? 'text-coral-500 hover:bg-coral-50 dark:hover:bg-coral-500/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300'}`}>
      {label}
    </button>
  );
}

function EmptyState({ icon, title, subtitle, action, actionLabel }: { icon: React.ReactNode; title: string; subtitle?: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-navy-300 flex items-center justify-center mb-3 text-gray-300 dark:text-gray-700">{icon}</div>
      <p className="text-gray-500 dark:text-gray-400 font-semibold">{title}</p>
      {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
      {action && actionLabel && (
        <button onClick={action} className="mt-4 px-5 py-2 rounded-full bg-sangam-gradient text-white text-sm font-semibold active:scale-95 transition-transform shadow-md shadow-coral-500/20">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-0.5 p-0.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="aspect-square skeleton" />
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="h-40 sm:h-56 skeleton" />
      <div className="px-4 -mt-12">
        <div className="flex items-end justify-between">
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full skeleton border-4 border-white dark:border-[#0b1220]" />
          <div className="h-9 w-24 rounded-full skeleton" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-5 w-40 rounded skeleton" />
          <div className="h-4 w-28 rounded skeleton" />
          <div className="h-4 w-64 rounded skeleton" />
          <div className="flex gap-5 mt-3">
            <div className="h-5 w-20 rounded skeleton" />
            <div className="h-5 w-20 rounded skeleton" />
            <div className="h-5 w-20 rounded skeleton" />
          </div>
        </div>
      </div>
      <div className="flex border-b border-gray-100 dark:border-navy-300 mt-4">
        {[0, 1, 2, 3].map((i) => (<div key={i} className="flex-1 py-3 flex justify-center"><div className="h-4 w-12 rounded skeleton" /></div>))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-0.5 p-0.5">
        {Array.from({ length: 9 }).map((_, i) => (<div key={i} className="aspect-square skeleton" />))}
      </div>
    </div>
  );
}
