import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Loader2, X, Globe, Lock, Eye, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount } from '@/lib/format';

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
  member_count?: number;
}

const PRIVACY_OPTIONS: { value: 'public' | 'private' | 'secret'; label: string; icon: typeof Globe }[] = [
  { value: 'public', label: 'Public', icon: Globe },
  { value: 'private', label: 'Private', icon: Lock },
  { value: 'secret', label: 'Secret', icon: Eye },
];

const CATEGORIES = ['Technology', 'Music', 'Sports', 'Gaming', 'Education', 'Lifestyle', 'Business', 'Art', 'Travel', 'Food'];

export default function GroupsPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  usePageTitle('Groups | Sangam');

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    setLoading(true);
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('loadGroups error', error);
    }
    if (data) {
      // Fetch member counts
      const groupsWithCounts = await Promise.all(
        (data as Group[]).map(async (g) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', g.id);
          return { ...g, member_count: count || 0 };
        }),
      );
      setGroups(groupsWithCounts);
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const cover_photo_url = formData.get('cover_photo_url') as string;
    const category = formData.get('category') as string;
    const privacy = formData.get('privacy') as 'public' | 'private' | 'secret';
    const rules = formData.get('rules') as string;

    if (!name.trim()) return;

    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        cover_photo_url: cover_photo_url.trim() || null,
        category: category || null,
        privacy,
        rules: rules.trim() || null,
        created_by: profile.id,
      })
      .select()
      .single();

    if (groupError || !groupData) {
      console.error('create group error', groupError);
      return;
    }

    // Add creator as admin member
    await supabase.from('group_members').insert({
      group_id: groupData.id,
      user_id: profile.id,
      role: 'admin',
    });

    setShowCreate(false);
    form.reset();
    loadGroups();
  }

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Users className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Groups</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold shadow-sm shadow-coral-500/20 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create Group</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-navy-300 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-300 dark:text-navy-50" />
          </div>
          <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">
            {search ? 'No groups found' : 'No groups yet'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {search ? 'Try a different search term.' : 'Create the first group to get started!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((group) => (
            <div
              key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            >
              {/* Cover */}
              <div className="h-28 w-full bg-gray-100 dark:bg-navy-300 relative">
                {group.cover_photo_url ? (
                  <img
                    src={group.cover_photo_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-sangam-gradient opacity-80" />
                )}
                {/* Privacy badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wide">
                  {group.privacy === 'public' && <Globe className="h-3 w-3" />}
                  {group.privacy === 'private' && <Lock className="h-3 w-3" />}
                  {group.privacy === 'secret' && <Eye className="h-3 w-3" />}
                  {group.privacy}
                </div>
              </div>
              {/* Body */}
              <div className="p-3">
                <h3 className="font-heading font-bold text-base text-gray-900 dark:text-white truncate">
                  {group.name}
                </h3>
                {group.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {group.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {formatCount(group.member_count || 0)} members
                  </span>
                  {group.category && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-navy-300 text-gray-500 dark:text-gray-400 font-medium">
                      {group.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 dark:border-navy-300 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-white dark:bg-navy-200 z-10">
              <button
                onClick={() => setShowCreate(false)}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="font-heading font-bold text-gray-900 dark:text-white">Create Group</h2>
              <div className="w-8" />
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Group Name
                </label>
                <input
                  name="name"
                  required
                  placeholder="My Awesome Group"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="What is this group about?"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Cover Photo URL
                </label>
                <input
                  name="cover_photo_url"
                  type="url"
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Privacy
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIVACY_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-200 dark:border-navy-300 cursor-pointer hover:border-brand-500 transition-colors has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:has-[:checked]:bg-brand-900/20"
                    >
                      <input type="radio" name="privacy" value={opt.value} defaultChecked={opt.value === 'public'} className="sr-only" />
                      <opt.icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Rules
                </label>
                <textarea
                  name="rules"
                  rows={3}
                  placeholder="Group rules and guidelines..."
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform"
              >
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
