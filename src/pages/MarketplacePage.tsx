import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Plus,
  Loader2,
  Search,
  Heart,
  MapPin,
  Tag,
  Package,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount } from '@/lib/format';
import { fetchListings, saveListing, unsaveListing } from '@/lib/marketplaceApi';
import type { MarketplaceListing } from '@/lib/types';

const CATEGORIES = [
  'All',
  'Electronics',
  'Clothes',
  'Vehicles',
  'Home',
  'Jobs',
  'Services',
  'Free',
] as const;

export default function MarketplacePage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [saveLoading, setSaveLoading] = useState<Set<string>>(new Set());

  usePageTitle('Marketplace | Sangam');

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    setLoading(true);
    try {
      const data = await fetchListings();
      setListings(data as MarketplaceListing[]);
    } catch (err) {
      console.error('loadListings error', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSave(listing: MarketplaceListing) {
    if (!profile) return;
    setSaveLoading((prev) => new Set([...prev, listing.id]));
    const wasSaved = listing.saved_by_me ?? false;
    // Optimistic update
    setListings((prev) =>
      prev.map((l) =>
        l.id === listing.id ? { ...l, saved_by_me: !wasSaved } : l,
      ),
    );
    try {
      if (wasSaved) {
        await unsaveListing(listing.id);
      } else {
        await saveListing(listing.id);
      }
    } catch (err) {
      console.error('toggleSave error', err);
      // Revert
      setListings((prev) =>
        prev.map((l) =>
          l.id === listing.id ? { ...l, saved_by_me: wasSaved } : l,
        ),
      );
    } finally {
      setSaveLoading((prev) => {
        const next = new Set(prev);
        next.delete(listing.id);
        return next;
      });
    }
  }

  const filtered = listings.filter((l) => {
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || l.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
          Marketplace
        </h1>
        <button
          onClick={() => navigate('/marketplace/new')}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold shadow-sm shadow-coral-500/20 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Sell</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search listings..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              category === cat
                ? 'bg-sangam-gradient text-white'
                : 'bg-white dark:bg-navy-200 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-navy-300 flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-gray-300 dark:text-navy-50" />
          </div>
          <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">
            No listings found
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {search || category !== 'All'
              ? 'Try adjusting your filters.'
              : 'Sell the first item!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((listing) => {
            const isSaved = listing.saved_by_me ?? false;
            const isLoading = saveLoading.has(listing.id);
            return (
              <div
                key={listing.id}
                onClick={() => navigate(`/marketplace/${listing.id}`)}
                className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              >
                {/* Photo */}
                <div className="aspect-square bg-gray-100 dark:bg-navy-300 relative">
                  {listing.image_urls && listing.image_urls.length > 0 ? (
                    <img
                      src={listing.image_urls[0]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
                      <Package className="h-8 w-8 text-white/70" />
                    </div>
                  )}
                  {/* Save button */}
                  {profile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSave(listing);
                      }}
                      disabled={isLoading}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 dark:bg-navy-200/90 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      ) : (
                        <Heart
                          className={`h-4 w-4 ${
                            isSaved ? 'fill-coral-500 text-coral-500' : 'text-gray-600 dark:text-gray-300'
                          }`}
                        />
                      )}
                    </button>
                  )}
                  {/* Price badge */}
                  <span className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs font-bold">
                    {listing.price === 0 ? 'FREE' : `$${listing.price}`}
                  </span>
                </div>
                {/* Info */}
                <div className="p-2.5">
                  <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
                    {listing.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-gray-400">
                    {listing.condition && (
                      <span className="flex items-center gap-0.5">
                        <Tag className="h-2.5 w-2.5" />
                        {listing.condition}
                      </span>
                    )}
                    {listing.location && (
                      <span className="flex items-center gap-0.5 truncate">
                        <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">{listing.location}</span>
                      </span>
                    )}
                  </div>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                    {listing.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
