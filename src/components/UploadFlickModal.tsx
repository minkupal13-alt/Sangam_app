import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Film, Check, Loader2, Music, Image as ImageIcon, ChevronLeft, Globe, Users, Lock } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { uploadFlickVideo, uploadFlickThumbnail, createFlick } from '@/lib/flickApi';

interface UploadFlickModalProps {
  onClose: () => void;
  onPublished: () => void;
}

type Step = 'select' | 'trim' | 'details';

export default function UploadFlickModal({ onClose, onPublished }: UploadFlickModalProps) {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [caption, setCaption] = useState('');
  const [audioName, setAudioName] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [audience, setAudience] = useState<'public' | 'circle' | 'private'>('public');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }
    setError('');
    setFile(f);
    const url = URL.createObjectURL(f);
    setVideoUrl(url);
    setStep('trim');
  }, []);

  function handleLoadedMetadata() {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setTrimEnd(v.duration);
  }

  function applyTrim() {
    setStep('details');
  }

  function captureThumbnail() {
    const v = previewVideoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas) return;
    v.currentTime = Math.min(v.currentTime, v.duration - 0.1);
    v.addEventListener('seeked', () => {
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (!blob || !profile) return;
        try {
          const url = await uploadFlickThumbnail(blob, profile.id);
          setThumbnailUrl(url);
        } catch {
          setError('Could not capture thumbnail');
        }
      }, 'image/jpeg', 0.85);
    }, { once: true });
  }

  async function handlePublish() {
    if (!file || !profile) return;
    setPublishing(true);
    setError('');
    setUploadProgress(0);
    try {
      const finalVideoUrl = await uploadFlickVideo(file, profile.id, (progress) => setUploadProgress(progress));
      await createFlick({
        videoUrl: finalVideoUrl,
        thumbnailUrl,
        caption: caption.trim(),
        audioName: audioName.trim() || undefined,
        audience,
        allowComments,
        allowDuet,
        allowStitch,
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
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-white dark:bg-navy-200 rounded-3xl border border-gray-200 dark:border-navy-300 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-white dark:bg-navy-200 z-10">
          {step !== 'select' ? (
            <button
              onClick={() => setStep(step === 'details' ? 'trim' : 'select')}
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
            {step === 'select' && t('flicks.newFlick')}
            {step === 'trim' && t('flicks.trim')}
            {step === 'details' && t('flicks.details')}
          </h2>
          <div className="w-8" />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 px-4 pt-3">
          {(['select', 'trim', 'details'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                (['select', 'trim', 'details'] as Step[]).indexOf(step) >= i
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
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 dark:border-navy-300 rounded-2xl p-8 text-center cursor-pointer hover:border-brand-500 transition-colors">
                  <Film className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                    {t('flicks.tapToSelect')}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">{t('flicks.videoHint')}</p>
                </div>
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

          {/* STEP 2: TRIM */}
          {step === 'trim' && (
            <div className="space-y-4">
              <div className="relative aspect-[9/16] max-h-[45vh] mx-auto rounded-2xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onLoadedMetadata={handleLoadedMetadata}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Start: {trimStart.toFixed(1)}s · End: {trimEnd.toFixed(1)}s · Length: {(trimEnd - trimStart).toFixed(1)}s
                </label>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-gray-400">Start</span>
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={trimStart}
                      onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.1))}
                      className="w-full accent-brand-500"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">End</span>
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={trimEnd}
                      onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.1))}
                      className="w-full accent-coral-500"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={applyTrim}
                className="w-full py-3 rounded-xl bg-sangam-gradient text-white font-bold active:scale-[0.98] transition-transform shadow-md shadow-coral-500/20"
              >
                {t('flicks.continue')}
              </button>
            </div>
          )}

          {/* STEP 3: DETAILS */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="relative aspect-[9/16] max-h-[35vh] mx-auto rounded-2xl overflow-hidden bg-black">
                <video
                  ref={previewVideoRef}
                  src={videoUrl}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <button
                onClick={captureThumbnail}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-navy-300 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
                {thumbnailUrl ? t('flicks.coverCaptured') : t('flicks.pickCover')}
              </button>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('flicks.caption')}</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  maxLength={280}
                  placeholder={t('flicks.captionPlaceholder')}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none text-sm"
                />
                <span className="text-xs text-gray-400">{caption.length}/280</span>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('flicks.audioName')}
                </label>
                <div className="relative">
                  <Music className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={audioName}
                    onChange={(e) => setAudioName(e.target.value)}
                    placeholder={t('flicks.audioPlaceholder')}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Audience selector */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{t('flicks.audience')}</label>
                <div className="flex gap-2">
                  {[
                    { key: 'public', icon: Globe, label: t('flicks.everyone') },
                    { key: 'circle', icon: Users, label: t('flicks.myCircle') },
                    { key: 'private', icon: Lock, label: t('flicks.onlyMe') },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setAudience(opt.key as 'public' | 'circle' | 'private')}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                        audience === opt.key
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600'
                          : 'border-gray-200 dark:border-navy-300 text-gray-500'
                      }`}
                    >
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                {[
                  { state: allowComments, set: setAllowComments, label: t('flicks.allowComments') },
                  { state: allowDuet, set: setAllowDuet, label: t('flicks.allowDuet') },
                  { state: allowStitch, set: setAllowStitch, label: t('flicks.allowStitch') },
                ].map((perm) => (
                  <label key={perm.label} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{perm.label}</span>
                    <button
                      onClick={() => perm.set(!perm.state)}
                      className={`h-6 w-11 rounded-full transition-colors ${perm.state ? 'bg-brand-500' : 'bg-gray-300 dark:bg-navy-300'}`}
                    >
                      <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${perm.state ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                ))}
              </div>

              {publishing && uploadProgress > 0 && (
                <div>
                  <div className="h-1.5 rounded-full bg-gray-200 dark:bg-navy-300 overflow-hidden">
                    <div className="h-full bg-sangam-gradient transition-[width]" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-1">{t('flicks.uploading')} {Math.round(uploadProgress)}%</p>
                </div>
              )}

              {error && <p className="text-coral-500 text-sm">{error}</p>}

              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full py-3 rounded-xl bg-sangam-gradient text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform shadow-md shadow-coral-500/20"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('flicks.publishing')}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> {t('flicks.publishFlick')}
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
