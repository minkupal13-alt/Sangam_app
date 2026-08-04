import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Loader2,
  ArrowLeft,
  MapPin,
  Tag,
  Package,
  DollarSign,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { fetchListingById, saveListing, unsaveListing } from '@/lib/marketplaceApi';
import type { MarketplaceListing } from '@/lib/types';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [saving, setSaving] = useState(false);

  usePageTitle(listing?.title ? `${listing.title} | Sangam` : 'Listing | Sangam');

  useEffect(() => {
    if (!id) return;
    loadListing();
  }, [id]);

  async function loadListing() {
    if (!id) return;
    setLoading(true);
    try {
      const data = (await fetchListingById(id, profile?.id)) as MarketplaceListing | null;
      setListing(data);
    } catch (err) {
      console.error('loadListing error', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSave() {
    if (!listing || !profile) return;
    setSaving(true);
    const wasSaved = listing.saved_by_me ?? false;
    setListing({ ...listing, saved_by_me: !wasSaved });
    try {
      if (wasSaved) {
        await unsaveListing(listing.id);
      } else {
        await saveListing(listing.id);
      }
    } catch (err) {
      console.error('toggleSave error', err);
      setListing({ ...listing, saved_by_me: wasSaved });
    } finally {
      setSaving(false);
    }
  }

  function handlePrevPhoto() {
    if (!listing?.image_urls?.length) return;
    setCurrentPhoto((prev) =>
      prev === 0 ? listing.image_urls.length - 1 : prev - 1,
    );
  }

  function handleNextPhoto() {
    if (!listing?.image_urls?.length) return;
    setCurrentPhoto((prev) =>
      prev === listing.image_urls.length - 1 ? 0 : prev + 1,
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <p className="text-gray-900 dark:text-white font-heading font-bold text-lg">
          Listing not found
        </p>
        <button
          onClick={() => navigate('/marketplace')}
          className="mt-4 px-4 py-2 rounded-xl bg-sangam-gradient text-white text-sm font-bold"
        >
          Back to Marketplace
        </button>
      </div>
    );
  }

  const photos = listing.image_urls || [];
  const isSaved = listing.saved_by_me ?? false;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Back */}
      <button
        onClick={() => navigate('/marketplace')}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-3 active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
        Marketplace
      </button>

      {/* Photo carousel */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-navy-300 aspect-square mb-4">
        {photos.length > 0 ? (
          <>
            <img
              src={photos[currentPhoto]}
              alt=""
              className="h-full w-full object-cover"
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 dark:bg-navy-200/90 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                </button>
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 dark:bg-navy-200/90 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
                >
                  <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                </button>
                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === currentPhoto
                          ? 'w-5 bg-white'
                          : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
            <Package className="h-16 w-16 text-white/70" />
          </div>
        )}
      </div>

      {/* Price + Title */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
            {listing.title}
          </h1>
          <p className="text-2xl font-heading font-extrabold text-coral-500 mt-1">
            {listing.price === 0 ? 'FREE' : `$${listing.price}`}
          </p>
        </div>
        {profile && (
          <button
            onClick={handleToggleSave}
            disabled={saving}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center active:scale-90 transition-transform"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            ) : (
              <Heart
                className={`h-5 w-5 ${
                  isSaved ? 'fill-coral-500 text-coral-500' : 'text-gray-600 dark:text-gray-300'
                }`}
              />
            )}
          </button>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mt-3">
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-xs font-semibold text-brand-600 dark:text-brand-400">
          <Tag className="h-3 w-3" />
          {listing.category}
        </span>
        {listing.condition && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-coral-50 dark:bg-coral-900/20 text-xs font-semibold text-coral-600 dark:text-coral-400 capitalize">
            <Package className="h-3 w-3" />
            {listing.condition}
          </span>
        )}
        {listing.location && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-navy-300 text-xs font-medium text-gray-600 dark:text-gray-300">
            <MapPin className="h-3 w-3" />
            {listing.location}
          </span>
        )}
      </div>

      {/* Description */}
      {listing.description && (
        <div className="mt-4 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
            {listing.description}
          </p>
        </div>
      )}

      {/* Seller card */}
      {listing.author && (
        <div className="mt-4 rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
          <div className="flex items-center gap-3">
            <div
              onClick={() => navigate(`/profile/${listing.author!.username}`)}
              className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 dark:bg-navy-300 cursor-pointer flex-shrink-0"
            >
              {listing.author.avatar_url ? (
                <img
                  src={listing.author.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-sangam-gradient flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            <div
              onClick={() => navigate(`/profile/${listing.author!.username}`)}
              className="min-w-0 flex-1 cursor-pointer"
            >
              <p className="font-heading font-bold text-sm text-gray-900 dark:text-white truncate">
                {listing.author.full_name || listing.author.username}
              </p>
              <p className="text-xs text-gray-400 truncate">@{listing.author.username}</p>
            </div>
            <button
              onClick={() => navigate('/chats')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform"
            >
              <MessageCircle className="h-4 w-4" />
              Message Seller
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
