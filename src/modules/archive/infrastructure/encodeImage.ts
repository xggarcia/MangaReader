interface EncodeOptions {
  /** Scale factor (at most 1) for an image of the given size. */
  scaleFor: (width: number, height: number) => number;
  type: string;
  quality: number;
  /** Return `null` instead of re-encoding when the image needs no downscaling. */
  skipWhenUnscaled?: boolean;
}

/**
 * Decodes, downscales and re-encodes an image off the main thread. Returns `null` when the
 * environment cannot do it (no OffscreenCanvas) or the image cannot be decoded.
 */
export async function encodeImage(image: Blob, options: EncodeOptions): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    return null;
  }
  let source: ImageBitmap | null = null;
  try {
    source = await createImageBitmap(image);
    const scale = options.scaleFor(source.width, source.height);
    if (scale >= 1 && options.skipWhenUnscaled) return null;
    const width = Math.max(1, Math.round(source.width * Math.min(1, scale)));
    const height = Math.max(1, Math.round(source.height * Math.min(1, scale)));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) return null;
    // Formats without alpha (JPEG) would turn transparent areas black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, width, height);
    return await canvas.convertToBlob({ type: options.type, quality: options.quality });
  } catch {
    return null;
  } finally {
    source?.close();
  }
}

export interface PageEncoding {
  type: string;
  extension: string;
}

let pageEncoding: Promise<PageEncoding> | null = null;

/**
 * Best lossy format this engine can encode: WebP where supported (Chromium), JPEG otherwise
 * (Safari silently falls back to PNG when asked for WebP).
 */
export function detectPageEncoding(): Promise<PageEncoding> {
  pageEncoding ??= (async () => {
    try {
      const probe = await new OffscreenCanvas(1, 1).convertToBlob({ type: 'image/webp' });
      if (probe.type === 'image/webp') return { type: 'image/webp', extension: 'webp' };
    } catch {
      // Fall through to JPEG.
    }
    return { type: 'image/jpeg', extension: 'jpg' };
  })();
  return pageEncoding;
}
