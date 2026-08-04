import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Plus, Loader2, X, FolderOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount } from '@/lib/format';

interface BookmarkCollection {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  item_count?: number;
}

export default function BookmarksPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [collections, setCollections] = useState<BookmarkCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  usePageTitle('Bookmarks | Sangam');

  useEffect(() => {
    if (profile) {
      loadCollections();
    } else {
      setLoading(false);
    }
  }, [profile]);

  async function loadCollections() {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('bookmark_collections')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('loadCollections error', error);
    }

    let collectionsWithCounts: BookmarkCollection[] = [];
    if (data) {
      collectionsWithCounts = await Promise.all(
        (data as BookmarkCollection[]).map(async (c) => {
          const { count } = await supabase
            .from('bookmark_items')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', c.id);
          return { ...c, item_count: count || 0 };
        }),
      );
      setCollections(collectionsWithCounts);
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !newName.trim()) return;
    setCreating(true);
    const { error } = await supabase.from('bookmark_collections').insert({
      name: newName.trim(),
      user_id: profile.id,
    });
    if (error) {
      console.error('create collection error', error);
      setCreating(false);
      return;
    }
    setNewName('');
    setShowCreate(false);
    setCreating(false);
    loadCollections();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Bookmark className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Bookmarks</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold shadow-sm shadow-coral-500/20 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Collection</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : !profile ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bookmark className="h-12 w-12 text-gray-300 dark:text-navy-50 mb-3" />
          <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">Sign in to see bookmarks</p>
          <p className="text-gray-400 text-sm mt-1">Log in to manage your saved collections.</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-navy-300 flex items-center justify-center mb-4">
            <FolderOpen className="h-8 w-8 text-gray-300 dark:text-navy-50" />
          </div>
          <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">No collections yet</p>
          <p className="text-gray-400 text-sm mt-1">Create a collection to start organizing your bookmarks.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform"
          >
            <Plus className="h-4 w-4" />
            Create Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              {/* Icon */}
              <div className="h-12 w-12 rounded-xl bg-sangam-gradient flex items-center justify-center mb-3">
                <Bookmark className="h-6 w-6 text-white" />
              </div>
              {/* Name */}
              <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white truncate">
                {collection.name}
              </h3>
              {/* Count */}
              <p className="text-xs text-gray-400 mt-1">
                {formatCount(collection.item_count || 0)} {(collection.item_count || 0) === 1 ? 'item' : 'items'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* New Collection Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 dark:border-navy-300 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300">
              <button
                onClick={() => setShowCreate(false)}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="font-heading font-bold text-gray-900 dark:text-white">New Collection</h2>
              <div className="w-8" />
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Collection Name
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  required
                  placeholder="My Saved Posts"
                  maxLength={50}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="w-full py-3 rounded-xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Collection
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
