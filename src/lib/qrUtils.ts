/**
 * QR code canvas generation utility.
 * Uses the qrcode npm package with a canvas fallback.
 */
import QRCode from 'qrcode';

export async function createQRCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  size: number,
): Promise<void> {
  try {
    await QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 1,
      color: { dark: '#0b1220', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  } catch {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0b1220';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR', size / 2, size / 2);
  }
}
