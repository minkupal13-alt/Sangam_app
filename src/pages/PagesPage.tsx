import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Search, ThumbsUp, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { formatCount } from '@/lib/format';
import PageSkeleton from '@/components/PageSkeleton';

interface Page_ {
  id: string;
  name: string;
  description: string;
  category: string;
  avatar_url: string | null;
  cover_url: string | null;
  owner_id: string;
  likes_count: number;
  created_at: string;
  profiles?: { username: string; full_name: string } | null;
}

export default function PagesPage() {
  const profile = useAuthStore((s) => s.profile);
  const [pages, setPages] = useState<Page_[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [likedPages, setLikedPages] = useState<Set<string>>(new Set());

  const fetchPages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pages')
      .select('*, profiles:owner_id(username, full_name)')
      .order('likes_count', { ascending: false })
      .limit(50);
    if (!error && data) setPages(data as Page_[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const filtered = pages.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase()),
  );

  async function toggleLike(pageId: string) {
    if (!profile) return;
    if (likedPages.has(pageId)) {
      setLikedPages((prev) => new Set([...prev].filter((id) => id !== pageId)));
      await supabase.from('page_likes').delete().eq('page_id', pageId).eq('user_id', profile.id);
      await supabase.from('pages').update({ likes_count: Math.max(0, (pages.find(p => p.id === pageId)?.likes_count || 1) - 1) }).eq('id', pageId);
    } else {
      setLikedPages((prev) => new Set([...prev, pageId]));
      await supabase.from('page_likes').insert({ page_id: pageId, user_id: profile.id });
      await supabase.from('pages').update({ likes_count: (pages.find(p => p.id === pageId)?.likes_count || 0) + 1 }).eq('id', pageId);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-gray-900 dark:text-white">Pages</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Discover businesses and creators</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sangam-gradient text-white text-sm font-semibold active:scale-95 transition-transform shadow-md shadow-coral-500/20">
          <Plus className="h-4 w-4" /> Create Page
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-navy-300 border border-transparent focus:border-brand-500 outline-none text-sm text-gray-900 dark:text-white transition-colors"
        />
      </div>

      {loading ? (
        <PageSkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <Globe className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No pages found. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-navy-200 rounded-2xl overflow-hidden border border-gray-100 dark:border-navy-300 shadow-sm hover:shadow-md transition-shadow"
            >
              {p.cover_url ? (
                <img src={p.cover_url} alt="" className="w-full h-24 object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-24 bg-gradient-to-r from-brand-500/20 to-coral-500/20" />
              )}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.name} className="h-12 w-12 rounded-xl object-cover -mt-8 border-2 border-white dark:border-navy-200" loading="lazy" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-sangam-gradient flex items-center justify-center -mt-8 border-2 border-white dark:border-navy-200">
                      <span className="text-white font-bold text-lg">{p.name[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-gray-900 dark:text-white text-base line-clamp-1">{p.name}</h3>
                    {p.category && <span className="text-xs text-brand-500 font-medium">{p.category}</span>}
                  </div>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mt-2">{p.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">{formatCount(p.likes_count)} likes</span>
                  <button
                    onClick={() => toggleLike(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      likedPages.has(p.id)
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 dark:bg-navy-300 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {likedPages.has(p.id) ? 'Liked' : 'Like'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
