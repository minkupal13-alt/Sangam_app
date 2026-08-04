import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Music, Play, Heart, Eye, Loader2 } from 'lucide-react';
import type { Flick } from '@/lib/types';
import { fetchFlicksByAudio } from '@/lib/flickApi';
import { formatCount } from '@/lib/format';
import { usePageTitle } from '@/lib/usePageTitle';

export default function FlickAudioPage() {
  const { t } = useTranslation();
  const { audioId } = useParams<{ audioId: string }>();
  const navigate = useNavigate();
  usePageTitle(`${t('flicks.audioPage')} | Sangam`);
  const audioName = audioId ? decodeURIComponent(audioId) : '';
  const [flicks, setFlicks] = useState<Flick[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!audioName) return;
    setLoading(true);
    try {
      const data = await fetchFlicksByAudio(audioName);
      setFlicks(data);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [audioName]);

  useEffect(() => { load(); }, [load]);

  const totalViews = flicks.reduce((sum, f) => sum + (f.views_count || 0), 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-4">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500 mb-3">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-sangam-gradient flex items-center justify-center flex-shrink-0">
            <Music className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white truncate">{audioName}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {formatCount(flicks.length)} {t('flicks.flicksWithAudio').toLowerCase()} · {formatCount(totalViews)} {t('flicks.views')}
            </p>
          </div>
          <button
            onClick={() => navigate('/flicks')}
            className="px-4 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform flex-shrink-0"
          >
            {t('flicks.useThisAudio')}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : flicks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Music className="h-12 w-12 text-gray-300 dark:text-navy-300 mb-3" />
            <p className="text-gray-400 text-sm">{t('flicks.noFlicks')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {flicks.map((f) => (
              <div
                key={f.id}
                onClick={() => navigate('/flicks')}
                className="aspect-[9/16] rounded-xl overflow-hidden bg-gray-100 dark:bg-navy-300 relative group cursor-pointer"
              >
                {f.thumbnail_url ? (
                  <img src={f.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Play className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <div className="flex items-center gap-2 text-white text-[10px] font-bold">
                    <span className="flex items-center gap-0.5">
                      <Heart className="h-3 w-3 fill-white" /> {formatCount(f.likes_count)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-3 w-3" /> {formatCount(f.views_count)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
