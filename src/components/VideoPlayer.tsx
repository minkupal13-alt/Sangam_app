import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Settings, Loader2, PictureInPicture as PiPIcon,
} from 'lucide-react';

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITIES = ['auto', '360', '720', '1080'];

interface VideoPlayerProps {
  src: string;
  poster?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onProgress?: (currentTime: number) => void;
}

export default function VideoPlayer({ src, poster, onTimeUpdate, onProgress }: VideoPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState('auto');
  const [theaterMode, setTheaterMode] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => { setPlaying(true); setLoading(false); };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onLoaded = () => { setDuration(v.duration); setLoading(false); };
    const onTime = () => {
      setCurrentTime(v.currentTime);
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1));
      }
      onTimeUpdate?.(v.currentTime, v.duration);
    };
    const onProg = () => onProgress?.(v.currentTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('progress', onProg);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('progress', onProg);
    };
  }, [onTimeUpdate, onProgress]);

  useEffect(() => {
    function onFsChange() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          v.paused ? v.play().catch(() => {}) : v.pause();
          showControlsTemporarily();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          v.muted = !v.muted;
          setMuted(v.muted);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          v.currentTime = Math.min(v.duration, v.currentTime + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          v.volume = Math.min(1, v.volume + 0.1);
          setVolume(v.volume);
          setMuted(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          v.volume = Math.max(0, v.volume - 0.1);
          setVolume(v.volume);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showControlsTemporarily]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    showControlsTemporarily();
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current;
    const bar = progressBarRef.current;
    if (!v || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  }

  function handleProgressHover(e: React.MouseEvent<HTMLDivElement>) {
    const bar = progressBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setHoverTime(pct * (duration || 0));
    setHoverX(e.clientX - rect.left);
  }

  function changeSpeed(s: number) {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
  }

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  async function togglePiP() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await v.requestPictureInPicture();
      }
    } catch { /* ignore */ }
  }

  function formatTime(s: number): string {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return `${h}:${String(mm).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative bg-black group select-none ${theaterMode ? 'rounded-none' : 'rounded-2xl overflow-hidden'}`}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        onClick={togglePlay}
        className="w-full aspect-video object-contain"
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" />
        </div>
      )}

      {/* Center play/pause */}
      {!playing && !loading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="h-16 w-16 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <Play className="h-8 w-8 text-white fill-white ml-1" />
          </div>
        </button>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-12 transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress bar */}
        <div
          ref={progressBarRef}
          className="group/bar relative h-1.5 hover:h-2.5 transition-all cursor-pointer mb-2"
          onClick={handleSeek}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setHoverTime(null)}
        >
          <div className="absolute inset-0 bg-white/20 rounded-full" />
          <div className="absolute inset-0 bg-white/30 rounded-full" style={{ width: `${bufferedPct}%` }} />
          <div className="absolute inset-0 bg-brand-500 rounded-full" style={{ width: `${progressPct}%` }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-brand-500 rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPct}% - 6px)` }}
          />
          {/* Hover preview time */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 bg-black/90 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none -translate-x-1/2"
              style={{ left: `${hoverX}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-2 text-white">
          <button onClick={togglePlay} className="h-8 w-8 flex items-center justify-center hover:text-brand-400 transition-colors">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-1 group/vol">
            <button onClick={toggleMute} className="h-8 w-8 flex items-center justify-center hover:text-brand-400 transition-colors">
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-0 group-hover/vol:w-16 transition-all duration-200 accent-brand-500 cursor-pointer"
            />
          </div>

          <span className="text-xs text-white/90 font-medium">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className={`h-8 w-8 flex items-center justify-center hover:text-brand-400 transition-colors ${showSettings ? 'text-brand-400' : ''}`}
            >
              <Settings className="h-5 w-5" />
            </button>
            {showSettings && (
              <div className="absolute bottom-10 right-0 w-44 bg-black/90 backdrop-blur-md rounded-xl py-1 text-sm">
                <div className="px-3 py-1.5 text-white/50 text-xs font-semibold">{t('watch.playbackSpeed')}</div>
                <div className="flex flex-wrap gap-1 px-2 pb-2">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { changeSpeed(s); }}
                      className={`px-2 py-1 rounded text-xs font-medium ${speed === s ? 'bg-brand-500 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                <div className="px-3 py-1.5 text-white/50 text-xs font-semibold border-t border-white/10">{t('watch.quality')}</div>
                <div className="flex flex-wrap gap-1 px-2 pb-2">
                  {QUALITIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setQuality(q); setShowSettings(false); }}
                      className={`px-2 py-1 rounded text-xs font-medium ${quality === q ? 'bg-brand-500 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
                    >
                      {q === 'auto' ? t('watch.auto') : `${q}p`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={togglePiP} className="h-8 w-8 flex items-center justify-center hover:text-brand-400 transition-colors" title={t('watch.pictureInPicture')}>
            <PiPIcon className="h-5 w-5" />
          </button>

          <button onClick={() => setTheaterMode((v) => !v)} className="h-8 w-8 flex items-center justify-center hover:text-brand-400 transition-colors text-xs font-bold" title={theaterMode ? t('watch.defaultMode') : t('watch.theaterMode')}>
            {theaterMode ? <Minimize className="h-5 w-5" /> : <Maximize className="h-4 w-4" />}
          </button>

          <button onClick={toggleFullscreen} className="h-8 w-8 flex items-center justify-center hover:text-brand-400 transition-colors" title={t('watch.fullscreen')}>
            {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
