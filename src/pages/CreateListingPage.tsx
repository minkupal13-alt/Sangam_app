import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  X,
  Loader2,
  ArrowLeft,
  DollarSign,
  Tag,
  MapPin,
  Package,
  ImagePlus,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { createListing } from '@/lib/marketplaceApi';
import { uploadMedia } from '@/lib/feedApi';

const CATEGORIES = [
  'Electronics',
  'Clothes',
  'Vehicles',
  'Home',
  'Jobs',
  'Services',
  'Free',
] as const;

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Used'] as const;

export default function CreateListingPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Electronics' as (typeof CATEGORIES)[number],
    condition: 'New' as (typeof CONDITIONS)[number],
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePageTitle('Sell an Item | Sangam');

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 10 - photos.length;
    const toAdd = files.slice(0, remaining);
    if (toAdd.length < files.length) {
      setError('Maximum 10 photos allowed.');
    } else {
      setError(null);
    }
    const previews = toAdd.map((f) => URL.createObjectURL(f));
    setPhotos((prev) => [...prev, ...previews]);
    setPhotoFiles((prev) => [...prev, ...toAdd]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!form.title.trim()) return;
    if (photoFiles.length === 0) {
      setError('Please add at least one photo.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Upload photos to supabase storage 'media' bucket
      setUploading(true);
      const uploadedUrls: string[] = [];
      for (const file of photoFiles) {
        const url = await uploadMedia(file, 'marketplace', profile.id);
        uploadedUrls.push(url);
      }
      setUploading(false);

      const listing = await createListing({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        price: form.category === 'Free' ? 0 : parseFloat(form.price) || 0,
        image_urls: uploadedUrls,
        category: form.category,
        condition: form.condition.toLowerCase() === 'new' ? 'new' : 'used',
        location: form.location.trim() || undefined,
      });
      if (listing?.id) {
        navigate(`/marketplace/${listing.id}`);
      } else {
        navigate('/marketplace');
      }
    } catch (err) {
      console.error('createListing error', err);
      setError('Failed to create listing. Please try again.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

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

      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Package className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
          Sell an Item
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photos */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Photos ({photos.length}/10)
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((url, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-navy-300"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-coral-500 text-white text-[10px] font-bold">
                    COVER
                  </span>
                )}
              </div>
            ))}
            {photos.length < 10 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-navy-300 flex flex-col items-center justify-center text-gray-400 hover:text-brand-500 hover:border-brand-500 transition-colors"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs mt-1">Add</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Title
          </label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="What are you selling?"
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            placeholder="Describe your item — condition, features, reason for selling..."
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Price ($)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              disabled={form.category === 'Free'}
              placeholder="0.00"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        {/* Category + Condition */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as (typeof CATEGORIES)[number] })
              }
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Condition
            </label>
            <select
              value={form.condition}
              onChange={(e) =>
                setForm({ ...form, condition: e.target.value as (typeof CONDITIONS)[number] })
              }
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="City, State"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {uploading ? 'Uploading photos...' : 'Publishing...'}
            </>
          ) : (
            'Publish Listing'
          )}
        </button>
      </form>
    </div>
  );
}
