import { useState, useRef } from 'react';
import { X, Loader2, Camera, Type, Send } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { createStory, uploadStoryMedia } from '@/lib/storyApi';

interface AddStoryModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const GRADIENTS = [
  'linear-gradient(135deg, #0ea5a4 0%, #ff6b4a 100%)',
  'linear-gradient(135deg, #0d9488 0%, #fb923c 100%)',
  'linear-gradient(135deg, #2dd4bf 0%, #fdba74 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #ff6b4a 100%)',
  'linear-gradient(135deg, #0f766e 0%, #fed7aa 100%)',
  'linear-gradient(135deg, #5eead4 0%, #fb923c 100%)',
  'linear-gradient(135deg, #99f6e4 0%, #ffedd5 100%)',
  'linear-gradient(135deg, #0ea5a4 0%, #fee140 100%)',
];

type Mode = 'select' | 'upload' | 'text';

export default function AddStoryModal({ open, onClose, onCreated }: AddStoryModalProps) {
  const profile = useAuthStore((s) => s.profile);
  const [mode, setMode] = useState<Mode>('select');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [gradient, setGradient] = useState(GRADIENTS[0]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  function reset() {
    setMode('select');
    setMediaUrl('');
    setCaption('');
    setGradient(GRADIENTS[0]);
    setError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    setError('');
    try {
      const isVideo = file.type.startsWith('video');
      const url = await uploadStoryMedia(file, profile.id);
      setMediaUrl(url);
      setMediaType(isVideo ? 'video' : 'image');
      setMode('upload');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
    setUploading(false);
  }

  async function handleSubmit() {
    if (!profile) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'text') {
        await createStory({
          mediaType: 'text',
          caption: caption.trim() || undefined,
          bgGradient: gradient,
        });
      } else if (mode === 'upload' && mediaUrl) {
        await createStory({
          mediaUrl,
          mediaType,
          caption: caption.trim() || undefined,
        });
      }
      onCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post story');
    }
    setLoading(false);
  }

  const canSubmit = mode === 'text' ? caption.trim().length > 0 : mediaUrl !== '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 dark:border-navy-300 animate-slideUp max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-white dark:bg-navy-200 z-10">
          <button
            onClick={handleClose}
            className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="font-heading font-bold text-gray-900 dark:text-white">Add Story</h2>
          <div className="w-8" />
        </div>

        {mode === 'select' && (
          <div className="p-4 space-y-2">
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-navy-300 hover:bg-gray-100 dark:hover:bg-navy-50 transition-colors disabled:opacity-50"
            >
              <div className="h-12 w-12 rounded-full bg-sangam-gradient flex items-center justify-center">
                {uploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Upload Photo or Video</p>
                <p className="text-gray-400 text-xs">Share a moment from your device</p>
              </div>
            </button>
            <button
              onClick={() => setMode('text')}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-navy-300 hover:bg-gray-100 dark:hover:bg-navy-50 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-coral-500 flex items-center justify-center">
                <Type className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Create Text Story</p>
                <p className="text-gray-400 text-xs">Write on a colorful gradient background</p>
              </div>
            </button>
            {error && <p className="text-coral-500 text-sm">{error}</p>}
          </div>
        )}

        {(mode === 'upload' || mode === 'text') && (
          <div className="p-4 space-y-4">
            {/* Preview */}
            <div className="relative aspect-[9/16] max-h-[50vh] mx-auto rounded-2xl overflow-hidden bg-gray-100 dark:bg-navy-300 flex items-center justify-center">
              {mode === 'upload' && mediaUrl && (
                <>
                  {mediaType === 'image' ? (
                    <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <video src={mediaUrl} className="h-full w-full object-cover" controls />
                  )}
                </>
              )}
              {mode === 'text' && (
                <div className="h-full w-full flex items-center justify-center p-6" style={{ background: gradient }}>
                  {caption && (
                    <p className="text-white text-2xl font-bold text-center break-words whitespace-pre-wrap">
                      {caption}
                    </p>
                  )}
                  {!caption && (
                    <p className="text-white/50 text-lg text-center">Type your story below...</p>
                  )}
                </div>
              )}
              {caption && mode === 'upload' && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white text-lg font-semibold text-center break-words whitespace-pre-wrap">
                    {caption}
                  </p>
                </div>
              )}
            </div>

            {/* Gradient picker for text stories */}
            {mode === 'text' && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {GRADIENTS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGradient(g)}
                    className={`h-10 w-10 rounded-full flex-shrink-0 border-2 transition-transform ${
                      gradient === g ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ background: g }}
                  />
                ))}
              </div>
            )}

            {/* Caption input */}
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={mode === 'text' ? 'Type your story...' : 'Add a caption...'}
              rows={mode === 'text' ? 3 : 2}
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none text-sm"
            />

            {error && <p className="text-coral-500 text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                canSubmit && !loading
                  ? 'bg-sangam-gradient text-white active:scale-[0.98]'
                  : 'bg-gray-200 dark:bg-navy-300 text-gray-400'
              }`}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Share Story
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
