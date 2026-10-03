const THUMBNAIL_TYPE = 'image/webp';
const THUMBNAIL_QUALITY = 0.82;

/**
 * Downscales an image to `maxWidth` (keeping its aspect ratio) off the main thread. Returns the
 * original image when the environment cannot resize it or it is already small enough.
 */
export async function createThumbnail(image: Blob, maxWidth: number): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    return image;
  }
  try {
    const source = await createImageBitmap(image);
    const scale = Math.min(1, maxWidth / source.width);
    if (scale === 1) {
      source.close();
      return image;
    }
    const width = Math.round(source.width * scale);
    const height = Math.round(source.height * scale);
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) {
      source.close();
      return image;
    }
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, width, height);
    source.close();
    return await canvas.convertToBlob({ type: THUMBNAIL_TYPE, quality: THUMBNAIL_QUALITY });
  } catch {
    return image;
  }
}
