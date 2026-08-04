import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarHeart, Loader2, Share2, ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { timeAgo } from '@/lib/format';

interface MemoryPost {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  media_type: 'text' | 'image' | 'video';
  created_at: string;
  years_ago: number;
}

export default function MemoriesPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [memories, setMemories] = useState<MemoryPost[]>([]);
  const [loading, setLoading] = useState(true);

  usePageTitle('Memories | Sangam');

  useEffect(() => {
    if (profile) {
      loadMemories();
    } else {
      setLoading(false);
    }
  }, [profile]);

  async function loadMemories() {
    if (!profile) return;
    setLoading(true);

    const now = new Date();
    const todayMonth = now.getMonth() + 1; // 1-indexed
    const todayDay = now.getDate();
    const currentYear = now.getFullYear();

    // Build date ranges for 1, 2, and 3 years ago
    const years = [1, 2, 3];
    const allMemories: MemoryPost[] = [];

    for (const yearsAgo of years) {
      const targetYear = currentYear - yearsAgo;
      // Build start/end of the target day in UTC
      const startOfDay = new Date(Date.UTC(targetYear, todayMonth - 1, todayDay, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(targetYear, todayMonth - 1, todayDay, 23, 59, 59));

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profile.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('loadMemories error', error);
        continue;
      }

      if (data) {
        const tagged = (data as Omit<MemoryPost, 'years_ago'>[]).map((p) => ({
          ...p,
          years_ago: yearsAgo,
        }));
        allMemories.push(...tagged);
      }
    }

    // Sort: most recent first (i.e., 1 year ago before 2 years ago)
    allMemories.sort((a, b) => a.years_ago - b.years_ago);
    setMemories(allMemories);
    setLoading(false);
  }

  function handleShareMemory(memory: MemoryPost) {
    // Navigate to create post with the content prefilled
    navigate(`/?prefill=${encodeURIComponent(memory.content)}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <CalendarHeart className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
            On This Day
          </h1>
          <p className="text-xs text-gray-400">Your memories from years past</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : !profile ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CalendarHeart className="h-12 w-12 text-gray-300 dark:text-navy-50 mb-3" />
          <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">Sign in to see memories</p>
          <p className="text-gray-400 text-sm mt-1">Log in to revisit your past posts.</p>
        </div>
      ) : memories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-navy-300 flex items-center justify-center mb-4">
            <CalendarHeart className="h-8 w-8 text-gray-300 dark:text-navy-50" />
          </div>
          <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">No memories today</p>
          <p className="text-gray-400 text-sm mt-1">
            You haven't posted on this day in previous years. Check back next time!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => (
            <div
              key={`${memory.id}-${memory.years_ago}`}
              className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden"
            >
              {/* Years ago badge */}
              <div className="flex items-center gap-2 px-4 pt-3">
                <div className="h-8 w-8 rounded-full bg-sangam-gradient flex items-center justify-center">
                  <CalendarHeart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-heading font-bold text-gray-900 dark:text-white">
                    {memory.years_ago} {memory.years_ago === 1 ? 'year' : 'years'} ago
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(memory.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {memory.content}
                </p>

                {/* Media */}
                {memory.media_urls && memory.media_urls.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 mt-3">
                    {memory.media_urls.slice(0, 4).map((url, i) => (
                      <div
                        key={i}
                        className="rounded-lg overflow-hidden aspect-square bg-gray-100 dark:bg-navy-300"
                      >
                        {memory.media_type === 'video' ? (
                          <video src={url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Share button */}
              <div className="px-4 pb-3 pt-2 border-t border-gray-50 dark:border-navy-300/50">
                <button
                  onClick={() => handleShareMemory(memory)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sangam-gradient text-white text-xs font-bold active:scale-95 transition-transform"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share Memory
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
