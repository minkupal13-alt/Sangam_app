import { useState, useEffect } from 'react';
import { FileText, Loader2, Eye, Trash2, Star, StarOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { timeAgo } from '@/lib/format';

const TABS = [
  { key: 'posts', label: 'Posts', table: 'posts' },
  { key: 'flicks', label: 'Flicks', table: 'flicks' },
  { key: 'videos', label: 'Watch', table: 'videos' },
  { key: 'stories', label: 'Stories', table: 'stories' },
  { key: 'marketplace', label: 'Marketplace', table: 'marketplace_listings' },
  { key: 'jobs', label: 'Jobs', table: 'jobs' },
  { key: 'podcasts', label: 'Podcasts', table: 'podcasts' },
  { key: 'groups', label: 'Groups', table: 'groups' },
  { key: 'pages', label: 'Pages', table: 'pages' },
] as const;

interface ContentItem {
  id: string;
  content?: string;
  caption?: string;
  title?: string;
  name?: string;
  created_at: string;
  user_id?: string;
}

export default function AdminContentPage() {
  usePageTitle('Content | Admin');
  const [tab, setTab] = useState<typeof TABS[number]['key']>('posts');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const currentTab = TABS.find((t) => t.key === tab)!;

  useEffect(() => { loadItems(); }, [tab]);

  async function loadItems() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(currentTab.table)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      setItems((data || []) as ContentItem[]);
    } catch (err) { console.error(err); setItems([]); }
    setLoading(false);
  }

  async function removeItem(id: string) {
    if (!confirm('Remove this content?')) return;
    const { error } = await supabase.from(currentTab.table).delete().eq('id', id);
    if (!error) loadItems();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Content Management</h1>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-sangam-gradient text-white' : 'bg-white dark:bg-navy-200 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-navy-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 text-sm">No content found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-3">
              <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-3">
                {item.content || item.caption || item.title || item.name || '(No text)'}
              </p>
              <p className="text-xs text-gray-400 mt-2">{timeAgo(item.created_at)}</p>
              <div className="flex gap-1 mt-2">
                <button className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-300" title="View">
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button className="h-7 w-7 rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Feature">
                  <Star className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => removeItem(item.id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
