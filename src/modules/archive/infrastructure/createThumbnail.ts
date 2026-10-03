import { encodeImage } from './encodeImage';

const THUMBNAIL_TYPE = 'image/webp';
const THUMBNAIL_QUALITY = 0.82;

/**
 * Downscales an image to `maxWidth` (keeping its aspect ratio) off the main thread. Returns the
 * original image when the environment cannot resize it or it is already small enough.
 */
export async function createThumbnail(image: Blob, maxWidth: number): Promise<Blob> {
  const thumbnail = await encodeImage(image, {
    scaleFor: (width) => Math.min(1, maxWidth / width),
    type: THUMBNAIL_TYPE,
    quality: THUMBNAIL_QUALITY,
    skipWhenUnscaled: true,
  });
  return thumbnail ?? image;
}
