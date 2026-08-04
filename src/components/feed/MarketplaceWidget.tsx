import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Tag, Heart } from 'lucide-react';

interface MarketplaceItem {
  id: string;
  title: string;
  price: string;
  image_url: string | null;
  seller: string;
  likes: number;
}

interface MarketplaceWidgetProps {
  items: MarketplaceItem[];
  loading: boolean;
}

export default function MarketplaceWidget({ items, loading }: MarketplaceWidgetProps) {
  const navigate = useNavigate();

  if (!loading && items.length === 0) return null;

  return (
    <div className="px-4 py-3 bg-gradient-to-r from-amber-50/20 to-coral-50/20 dark:from-amber-900/5 dark:to-coral-900/5 border-y border-amber-100/50 dark:border-amber-900/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-coral-500 flex items-center justify-center">
            <ShoppingBag className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="font-heading font-extrabold text-base text-gray-900 dark:text-white">
            Marketplace Picks
          </h2>
        </div>
        <button
          onClick={() => navigate('/explore')}
          className="text-xs font-semibold text-brand-500 hover:underline"
        >
          See All
        </button>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-32 h-40 rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-32 rounded-xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/explore')}
            >
              <div className="aspect-square bg-gray-100 dark:bg-navy-300 relative">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-gray-300" />
                  </div>
                )}
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-coral-500 text-white text-[9px] font-bold flex items-center gap-0.5">
                  <Tag className="h-2 w-2" /> Deal
                </span>
              </div>
              <div className="p-2">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {item.title}
                </p>
                <p className="text-sm font-extrabold text-coral-500 mt-0.5">{item.price}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-400 truncate">{item.seller}</span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Heart className="h-2.5 w-2.5" /> {item.likes}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
