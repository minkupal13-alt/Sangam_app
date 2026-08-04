import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Loader2,
  Globe,
  Lock,
  Eye,
  LogIn,
  LogOut,
  Shield,
  Crown,
  User as UserIcon,
  FileText,
  ImageIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount, timeAgo } from '@/lib/format';
import type { Profile } from '@/lib/types';

interface Group {
  id: string;
  name: string;
  description: string | null;
  cover_photo_url: string | null;
  category: string | null;
  privacy: 'public' | 'private' | 'secret';
  rules: string | null;
  created_by: string;
  created_at: string;
}

interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  created_at: string;
  author?: Profile;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  profile?: Profile;
}

type Tab = 'posts' | 'members' | 'about' | 'media';

const TABS: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'posts', label: 'Posts', icon: FileText },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'about', label: 'About', icon: Globe },
  { key: 'media', label: 'Media', icon: ImageIcon },
];

const ROLE_BADGES: Record<string, { label: string; icon: typeof Crown; class: string }> = {
  admin: { label: 'Admin', icon: Crown, class: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  moderator: { label: 'Moderator', icon: Shield, class: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400' },
  member: { label: 'Member', icon: UserIcon, class: 'bg-gray-100 text-gray-500 dark:bg-navy-300 dark:text-gray-400' },
};

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [joinLeaveLoading, setJoinLeaveLoading] = useState(false);

  usePageTitle(group ? `${group.name} | Sangam` : 'Group | Sangam');

  useEffect(() => {
    if (!id) return;
    loadGroup();
  }, [id]);

  async function loadGroup() {
    if (!id) return;
    setLoading(true);

    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (groupError || !groupData) {
      console.error('loadGroup error', groupError);
      setLoading(false);
      return;
    }
    setGroup(groupData as Group);

    // Load posts with author
    const { data: postsData } = await supabase
      .from('group_posts')
      .select('*')
      .eq('group_id', id)
      .order('created_at', { ascending: false });

    let postsWithAuthors: GroupPost[] = [];
    if (postsData && postsData.length > 0) {
      const authorIds = [...new Set((postsData as GroupPost[]).map((p) => p.user_id))];
      const { data: authors } = await supabase
        .from('profiles')
        .select('*')
        .in('id', authorIds);
      const authorMap = new Map<string, Profile>();
      (authors || []).forEach((a) => authorMap.set(a.id, a as Profile));
      postsWithAuthors = (postsData as GroupPost[]).map((p) => ({
        ...p,
        author: authorMap.get(p.user_id),
      }));
    }
    setPosts(postsWithAuthors);

    // Load members with profiles
    const { data: membersData } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', id)
      .order('joined_at', { ascending: true });

    let membersWithProfiles: GroupMember[] = [];
    if (membersData && membersData.length > 0) {
      const userIds = [...new Set((membersData as GroupMember[]).map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      const profileMap = new Map<string, Profile>();
      (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));
      membersWithProfiles = (membersData as GroupMember[]).map((m) => ({
        ...m,
        profile: profileMap.get(m.user_id),
      }));
    }
    setMembers(membersWithProfiles);
    setMemberCount(membersWithProfiles.length);

    // Check if current user is a member
    if (profile) {
      const isMemberFlag = membersWithProfiles.some((m) => m.user_id === profile.id);
      setIsMember(isMemberFlag);
    }

    setLoading(false);
  }

  async function handleJoin() {
    if (!profile || !id) return;
    setJoinLeaveLoading(true);
    const { error } = await supabase.from('group_members').insert({
      group_id: id,
      user_id: profile.id,
      role: 'member',
    });
    if (!error) {
      setIsMember(true);
      setMemberCount((c) => c + 1);
      loadGroup();
    }
    setJoinLeaveLoading(false);
  }

  async function handleLeave() {
    if (!profile || !id) return;
    setJoinLeaveLoading(true);
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', id)
      .eq('user_id', profile.id);
    if (!error) {
      setIsMember(false);
      setMemberCount((c) => Math.max(0, c - 1));
      loadGroup();
    }
    setJoinLeaveLoading(false);
  }

  // Collect all media from posts
  const allMedia = posts.flatMap((p) => p.media_urls || []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">Group not found</p>
        <button
          onClick={() => navigate('/groups')}
          className="mt-4 px-4 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold"
        >
          Back to Groups
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate('/groups')}
          className="h-9 w-9 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="font-heading font-bold text-sm text-gray-500 dark:text-gray-400">Groups</span>
      </div>

      {/* Cover */}
      <div className="h-40 sm:h-56 w-full bg-gray-100 dark:bg-navy-300 relative overflow-hidden mx-auto max-w-3xl">
        {group.cover_photo_url ? (
          <img src={group.cover_photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-sangam-gradient" />
        )}
      </div>

      {/* Group info */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
                {group.name}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {formatCount(memberCount)} members
                </span>
                <span className="flex items-center gap-1">
                  {group.privacy === 'public' && <Globe className="h-3 w-3" />}
                  {group.privacy === 'private' && <Lock className="h-3 w-3" />}
                  {group.privacy === 'secret' && <Eye className="h-3 w-3" />}
                  <span className="uppercase">{group.privacy}</span>
                </span>
                {group.category && <span>· {group.category}</span>}
              </div>
            </div>
            {profile && (
              <button
                onClick={isMember ? handleLeave : handleJoin}
                disabled={joinLeaveLoading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold active:scale-95 transition-transform flex-shrink-0 ${
                  isMember
                    ? 'bg-gray-100 dark:bg-navy-300 text-gray-600 dark:text-gray-300'
                    : 'bg-sangam-gradient text-white shadow-sm shadow-coral-500/20'
                }`}
              >
                {joinLeaveLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isMember ? (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Leave</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Join</span>
                  </>
                )}
              </button>
            )}
          </div>
          {group.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">{group.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-1 border-b border-gray-200 dark:border-navy-300 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'text-brand-500 border-brand-500'
                  : 'text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 py-4">
        {/* Posts tab */}
        {activeTab === 'posts' && (
          <div className="space-y-3">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-10 w-10 text-gray-300 dark:text-navy-50 mb-3" />
                <p className="text-gray-900 dark:text-white font-heading font-bold text-base">No posts yet</p>
                <p className="text-gray-400 text-sm mt-1">Be the first to post in this group!</p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={post.author?.avatar_url || `https://ui-avatars.com/api/?name=${post.author?.full_name || 'U'}`}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {post.author?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.content}</p>
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 mt-3">
                      {post.media_urls.map((url, i) => (
                        <img key={i} src={url} alt="" className="w-full h-32 object-cover rounded-lg" />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Members tab */}
        {activeTab === 'members' && (
          <div className="space-y-2">
            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-10 w-10 text-gray-300 dark:text-navy-50 mb-3" />
                <p className="text-gray-900 dark:text-white font-heading font-bold text-base">No members yet</p>
              </div>
            ) : (
              members.map((member) => {
                const badge = ROLE_BADGES[member.role] || ROLE_BADGES.member;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300"
                  >
                    <img
                      src={member.profile?.avatar_url || `https://ui-avatars.com/api/?name=${member.profile?.full_name || 'U'}`}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {member.profile?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">@{member.profile?.username || 'unknown'}</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${badge.class}`}>
                      <badge.icon className="h-3 w-3" />
                      {badge.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* About tab */}
        {activeTab === 'about' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
              <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-2">About</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {group.description || 'No description provided.'}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
              <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-2">Rules</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {group.rules || 'No rules specified.'}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
              <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white mb-2">Group Info</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Privacy</span>
                  <span className="font-semibold capitalize">{group.privacy}</span>
                </div>
                <div className="flex justify-between">
                  <span>Category</span>
                  <span className="font-semibold">{group.category || 'Uncategorized'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created</span>
                  <span className="font-semibold">{timeAgo(group.created_at)} ago</span>
                </div>
                <div className="flex justify-between">
                  <span>Members</span>
                  <span className="font-semibold">{formatCount(memberCount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Media tab */}
        {activeTab === 'media' && (
          <div>
            {allMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ImageIcon className="h-10 w-10 text-gray-300 dark:text-navy-50 mb-3" />
                <p className="text-gray-900 dark:text-white font-heading font-bold text-base">No media yet</p>
                <p className="text-gray-400 text-sm mt-1">Photos and videos from posts will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allMedia.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-xl" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
