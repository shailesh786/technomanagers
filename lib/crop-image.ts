/**
 * Client-side 16:9 enforcement for Hero Priority Board image uploads.
 * Center-crops the largest 16:9 region out of the source and re-encodes at a
 * bounded width, so a single admin upload serves both breakpoints.
 */

export const HERO_IMAGE_ASPECT = 16 / 9;

/** Max output width — 3 columns at 1400px container never exceeds ~460px,
 *  mobile one-up tops out near device width; 1600 leaves retina headroom. */
const MAX_OUTPUT_WIDTH = 1600;

export async function cropImageTo16x9(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width: sourceW, height: sourceH } = bitmap;

    // Largest centered 16:9 window that fits inside the source.
    let cropW = sourceW;
    let cropH = sourceW / HERO_IMAGE_ASPECT;
    if (cropH > sourceH) {
      cropH = sourceH;
      cropW = sourceH * HERO_IMAGE_ASPECT;
    }
    const sx = (sourceW - cropW) / 2;
    const sy = (sourceH - cropH) / 2;

    const outW = Math.min(MAX_OUTPUT_WIDTH, Math.round(cropW));
    const outH = Math.round(outW / HERO_IMAGE_ASPECT);

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, outW, outH);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Image crop failed'))),
        'image/webp',
        0.85,
      );
    });
  } finally {
    bitmap.close();
  }
}
