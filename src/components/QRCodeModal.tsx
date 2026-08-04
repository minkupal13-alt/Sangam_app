import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, Share2 } from 'lucide-react';
import SangamLogo from '@/components/SangamLogo';
import type { Profile } from '@/lib/types';

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
}

export default function QRCodeModal({ open, onClose, profile }: QRCodeModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrReady, setQrReady] = useState(false);

  const profileUrl = `${window.location.origin}/u/${profile.username}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      // Dynamically import qrcode generation
      const { createQRCanvas } = await import('@/lib/qrUtils');
      if (cancelled || !canvasRef.current) return;
      createQRCanvas(canvasRef.current, profileUrl, 256);
      setQrReady(true);
    })();
    return () => { cancelled = true; };
  }, [open, profileUrl]);

  if (!open) return null;

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `sangam-${profile.username}-qr.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profile.full_name} | Sangam`, url: profileUrl });
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(profileUrl).catch(() => {});
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-sm mx-4 bg-white dark:bg-navy-200 rounded-3xl overflow-hidden animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4">
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500">
            <X className="h-4 w-4" />
          </button>
          <h2 className="font-heading font-bold text-gray-900 dark:text-white">{t('qrCode.title')}</h2>
          <div className="w-8" />
        </div>

        <div className="p-6 flex flex-col items-center">
          <div className="p-1 rounded-3xl bg-sangam-gradient">
            <div className="bg-white p-4 rounded-3xl flex flex-col items-center">
              <canvas ref={canvasRef} className="rounded-xl" />
              <div className="mt-2 flex items-center gap-1.5">
                <SangamLogo size={20} />
                <span className="font-heading font-bold text-sm text-gray-900">Sangam</span>
              </div>
            </div>
          </div>

          <p className="mt-4 font-heading font-bold text-lg text-gray-900 dark:text-white">{profile.full_name}</p>
          <p className="text-gray-500 text-sm">@{profile.username}</p>

          <div className="flex gap-3 mt-6 w-full">
            <button
              onClick={handleDownload}
              disabled={!qrReady}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-sangam-gradient text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 shadow-md shadow-coral-500/20"
            >
              <Download className="h-4 w-4" /> {t('qrCode.download')}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-gray-100 dark:bg-navy-300 text-gray-700 dark:text-gray-300 text-sm font-semibold active:scale-95 transition-transform"
            >
              <Share2 className="h-4 w-4" /> {t('qrCode.share')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
