import { useNavigate } from 'react-router-dom';
import { TrendingUp, Hash } from 'lucide-react';

interface TrendingTopicsProps {
  topics: { tag: string; count: number }[];
  loading: boolean;
}

export default function TrendingTopics({ topics, loading }: TrendingTopicsProps) {
  const navigate = useNavigate();

  if (!loading && topics.length === 0) return null;

  return (
    <div className="mx-4 my-3 p-4 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-coral-500" />
        <h2 className="font-heading font-extrabold text-sm text-gray-900 dark:text-white">
          Trending Topics
        </h2>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 w-full rounded skeleton" />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {topics.map(({ tag, count }, i) => (
            <button
              key={tag}
              onClick={() => navigate(`/explore?tag=${tag}`)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors text-left"
            >
              <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
              <Hash className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1 truncate">
                {tag}
              </span>
              <span className="text-xs text-gray-400">{formatCount(count)} posts</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${n}`;
}
