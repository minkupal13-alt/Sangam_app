import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Newspaper, Loader2, Calendar, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/format';

interface NewsletterPost {
  id: string;
  title: string;
  content: string;
  published_at: string | null;
  created_at: string;
}

interface Newsletter {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  profiles?: { username: string; full_name: string; avatar_url: string | null } | null;
}

export default function NewsletterBlogPage() {
  const { username } = useParams<{ username: string }>();
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [posts, setPosts] = useState<NewsletterPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<NewsletterPost | null>(null);

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      if (!prof) { setLoading(false); return; }
      const { data: nl } = await supabase
        .from('newsletters')
        .select('*, profiles:owner_id(username, full_name, avatar_url)')
        .eq('owner_id', prof.id)
        .maybeSingle();
      if (nl) {
        setNewsletter(nl as Newsletter);
        const { data: postData } = await supabase
          .from('newsletter_posts')
          .select('id, title, content, published_at, created_at')
          .eq('newsletter_id', nl.id)
          .order('created_at', { ascending: false });
        if (postData) setPosts(postData as NewsletterPost[]);
      }
      setLoading(false);
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#fafaf9] dark:bg-[#0b1220]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (selectedPost) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => setSelectedPost(null)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-500 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to posts
        </button>
        <h1 className="font-heading text-2xl font-extrabold text-gray-900 dark:text-white mb-2">{selectedPost.title}</h1>
        <p className="text-gray-400 text-xs mb-6">
          {timeAgo(selectedPost.published_at || selectedPost.created_at)}
        </p>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{selectedPost.content}</p>
        </div>
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <Newspaper className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">No newsletter found for @{username}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        {newsletter.profiles?.avatar_url ? (
          <img src={newsletter.profiles.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-sangam-gradient flex items-center justify-center">
            <Newspaper className="h-6 w-6 text-white" />
          </div>
        )}
        <div>
          <h1 className="font-heading text-xl font-extrabold text-gray-900 dark:text-white">{newsletter.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{newsletter.description}</p>
          <Link to={`/u/${username}`} className="text-xs text-brand-500 hover:underline">by @{username}</Link>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
          <Newspaper className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No posts yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="w-full text-left p-4 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 hover:shadow-md transition-shadow"
            >
              <h2 className="font-heading font-bold text-gray-900 dark:text-white text-base mb-1">{post.title}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2">{post.content}</p>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                <Calendar className="h-3 w-3" />
                {timeAgo(post.published_at || post.created_at)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
