import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Upload,
  Film,
  Check,
  Loader2,
  Image as ImageIcon,
  ChevronLeft,
  Tag,
  Globe,
  Link2,
  Lock,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import {
  uploadWatchVideo,
  uploadWatchThumbnail,
  createVideo,
  VIDEO_CATEGORIES,
} from '@/lib/watchApi';

interface UploadVideoModalProps {
  onClose: () => void;
  onPublished: () => void;
}

type Step = 'select' | 'thumbnail' | 'details';

export default function UploadVideoModal({ onClose, onPublished }: UploadVideoModalProps) {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>('');
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [thumbnailOptions, setThumbnailOptions] = useState<string[]>([]);
  const [selectedThumb, setSelectedThumb] = useState<string | null>(null);
  const [customThumb, setCustomThumb] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Music');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [commentsSetting, setCommentsSetting] = useState<'allow' | 'hold' | 'disabled'>('allow');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }
    setError('');
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setStep('thumbnail');
  }, []);

  function handleLoadedMetadata() {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
  }

  function captureFrame(time: number): Promise<string> {
    return new Promise((resolve) => {
      const v = videoRef.current;
      const canvas = canvasRef.current;
      if (!v || !canvas) return resolve('');
      v.currentTime = Math.min(time, v.duration - 0.1);
      v.addEventListener(
        'seeked',
        () => {
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve('');
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        },
        { once: true },
      );
    });
  }

  async function generateThumbnails() {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const times = [v.duration * 0.1, v.duration * 0.5, v.duration * 0.9];
    const frames: string[] = [];
    for (const t of times) {
      const f = await captureFrame(t);
      if (f) frames.push(f);
    }
    setThumbnailOptions(frames);
    if (frames.length > 0) setSelectedThumb(frames[0]);
  }

  useEffect(() => {
    if (step === 'thumbnail' && videoUrl) {
      // Wait for metadata to load, then generate frames
      const timer = setTimeout(generateThumbnails, 500);
      return () => clearTimeout(timer);
    }
  }, [step, videoUrl]);

  async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return res.blob();
  }

  async function handleCustomThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !profile) return;
    try {
      const url = await uploadWatchThumbnail(f, profile.id);
      setCustomThumb(url);
      setSelectedThumb(null);
    } catch {
      setError('Could not upload thumbnail');
    }
  }

  async function handleUploadToStorage() {
    if (!file || !profile) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadWatchVideo(file, profile.id, setUploadPct);
      setUploadedVideoUrl(url);
      setStep('details');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
    setUploading(false);
  }

  async function handlePublish() {
    if (!profile || !uploadedVideoUrl) return;
    setPublishing(true);
    setError('');
    try {
      let finalThumb = customThumb;
      if (!finalThumb && selectedThumb) {
        const blob = await dataUrlToBlob(selectedThumb);
        finalThumb = await uploadWatchThumbnail(blob, profile.id);
      }
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);
      await createVideo({
        videoUrl: uploadedVideoUrl,
        thumbnailUrl: finalThumb,
        title: title.trim(),
        description: description.trim(),
        category,
        tags,
        visibility,
        durationSeconds: Math.round(duration),
        commentsSetting,
        scheduledAt: scheduleEnabled && scheduleDate ? new Date(scheduleDate).toISOString() : null,
      });
      onPublished();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    }
    setPublishing(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-navy-200 rounded-3xl border border-gray-200 dark:border-navy-300 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-white dark:bg-navy-200 z-10">
          {step !== 'select' ? (
            <button
              onClick={() =>
                setStep(step === 'details' ? 'thumbnail' : 'select')
              }
              className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <h2 className="font-heading font-bold text-gray-900 dark:text-white">
            {step === 'select' && t('watch.uploadVideo')}
            {step === 'thumbnail' && t('watch.chooseThumbnail')}
            {step === 'details' && t('watch.details')}
          </h2>
          <div className="w-8" />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 px-4 pt-3">
          {(['select', 'thumbnail', 'details'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                (['select', 'thumbnail', 'details'] as Step[]).indexOf(step) >= i
                  ? 'bg-sangam-gradient'
                  : 'bg-gray-200 dark:bg-navy-300'
              }`}
            />
          ))}
        </div>

        <div className="p-4">
          {/* STEP 1: SELECT */}
          {step === 'select' && (
            <div className="space-y-4">
              <label
                className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10'
                    : 'border-gray-300 dark:border-navy-300 hover:border-brand-500'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
              >
                <Film className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                  {t('watch.dragDrop')}
                </p>
                <p className="text-gray-400 text-xs mt-1">{t('watch.videoFormats')}</p>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>
              {error && <p className="text-coral-500 text-sm text-center">{error}</p>}
            </div>
          )}

          {/* STEP 2: THUMBNAIL */}
          {step === 'thumbnail' && (
            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onLoadedMetadata={handleLoadedMetadata}
                  className="w-full h-full object-contain"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('watch.pickThumbnail')}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {thumbnailOptions.map((thumb, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedThumb(thumb);
                        setCustomThumb(null);
                      }}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedThumb === thumb
                          ? 'border-brand-500'
                          : 'border-transparent'
                      }`}
                    >
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                      {selectedThumb === thumb && (
                        <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                          <Check className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-navy-300 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors cursor-pointer">
                <ImageIcon className="h-4 w-4" />
                {customThumb ? t('watch.customThumbnailDone') : t('watch.customThumbnail')}
                <input type="file" accept="image/*" className="hidden" onChange={handleCustomThumb} />
              </label>

              <button
                onClick={handleUploadToStorage}
                disabled={uploading}
                className="w-full py-3 rounded-xl bg-sangam-gradient text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform shadow-md shadow-coral-500/20"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('watch.uploading')} {uploadPct}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> {t('watch.continue')}
                  </>
                )}
              </button>
              {uploading && (
                <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-navy-300 overflow-hidden">
                  <div
                    className="h-full bg-sangam-gradient transition-all"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
              )}
              {error && <p className="text-coral-500 text-sm">{error}</p>}
            </div>
          )}

          {/* STEP 3: DETAILS */}
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('watch.videoTitle')} <span className="text-coral-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder={t('watch.titlePlaceholder')}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors text-sm"
                />
                <span className="text-xs text-gray-400">{title.length}/100</span>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('watch.description')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  placeholder={t('watch.descriptionPlaceholder')}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('watch.category')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors text-sm"
                >
                  {VIDEO_CATEGORIES.filter((c) => c !== 'All' && c !== 'Trending').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('watch.tags')} ({t('watch.tagsHint')})
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="music, tutorial, vlog..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('watch.visibility')}
                </label>
                <div className="space-y-2">
                  {(['public', 'unlisted', 'private'] as const).map((v) => (
                    <label
                      key={v}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-navy-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors"
                    >
                      <input
                        type="radio"
                        name="visibility"
                        checked={visibility === v}
                        onChange={() => setVisibility(v)}
                        className="accent-brand-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {v === 'public' && <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {t('watch.public')}</span>}
                          {v === 'unlisted' && <span className="flex items-center gap-1"><Link2 className="h-3.5 w-3.5" /> {t('watch.unlisted')}</span>}
                          {v === 'private' && <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> {t('watch.private')}</span>}
                        </p>
                        <p className="text-xs text-gray-400">
                          {v === 'public' && t('watch.publicDesc')}
                          {v === 'unlisted' && t('watch.unlistedDesc')}
                          {v === 'private' && t('watch.privateDesc')}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Comments setting */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('watch.commentsSetting')}
                </label>
                <div className="space-y-2">
                  {(['allow', 'hold', 'disabled'] as const).map((v) => (
                    <label
                      key={v}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-navy-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors"
                    >
                      <input
                        type="radio"
                        name="commentsSetting"
                        checked={commentsSetting === v}
                        onChange={() => setCommentsSetting(v)}
                        className="accent-brand-500"
                      />
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {v === 'allow' && t('watch.commentsAllow')}
                          {v === 'hold' && t('watch.commentsHold')}
                          {v === 'disabled' && t('watch.commentsDisable')}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {t('watch.schedule')}
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-navy-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                    className="accent-brand-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('watch.scheduleDate')}</span>
                </label>
                {scheduleEnabled && (
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full mt-2 px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors text-sm"
                  />
                )}
              </div>

              {error && <p className="text-coral-500 text-sm">{error}</p>}

              <button
                onClick={handlePublish}
                disabled={publishing || !title.trim()}
                className="w-full py-3 rounded-xl bg-sangam-gradient text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform shadow-md shadow-coral-500/20"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('watch.publishing')}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> {t('watch.publishVideo')}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
