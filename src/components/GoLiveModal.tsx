import { useState } from 'react';
import { X, Radio, ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { startLiveStream } from '@/lib/liveApi';
import { awardPoints, POINTS } from '@/lib/pointsApi';

interface GoLiveModalProps {
  open: boolean;
  onClose: () => void;
  onLive: (streamId: string) => void;
}

export default function GoLiveModal({ open, onClose, onLive }: GoLiveModalProps) {
  const [title, setTitle] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleUpload(file: File) {
    setUploading(true);
    setError('');
    try {
      const { data: user } = await supabase.auth.getUser();
      const ext = file.name.split('.').pop();
      const path = `live/${user.user?.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('media').upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
      setThumbnailUrl(pub.publicUrl);
    } catch {
      setError('Upload failed');
    }
    setUploading(false);
  }

  async function handleStart() {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    setStarting(true);
    setError('');
    try {
      const stream = await startLiveStream(title.trim(), thumbnailUrl);
      if (stream) {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          await awardPoints(user.user.id, 'Go Live', POINTS.post);
        }
        onLive(stream.id);
        onClose();
        setTitle('');
        setThumbnailUrl(null);
      }
    } catch {
      setError('Failed to start stream');
    }
    setStarting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-navy-100 rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-red-500 flex items-center justify-center">
              <Radio className="h-5 w-5 text-white" />
            </div>
            <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-white">Go Live</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">Stream Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you streaming?"
              maxLength={100}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">Thumbnail (optional)</label>
            {thumbnailUrl ? (
              <div className="relative rounded-xl overflow-hidden h-32">
                <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
                <button onClick={() => setThumbnailUrl(null)} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center">
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-navy-300 cursor-pointer hover:border-brand-400 transition-colors">
                {uploading ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : (<><ImagePlus className="h-6 w-6 text-gray-400 mb-1" /><span className="text-xs text-gray-400">Upload thumbnail</span></>)}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              </label>
            )}
          </div>
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <button onClick={handleStart} disabled={starting} className="w-full py-3 rounded-xl bg-red-500 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
            {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Radio className="h-5 w-5" /> Start Streaming</>}
          </button>
        </div>
      </div>
    </div>
  );
}
