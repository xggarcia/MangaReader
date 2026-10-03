import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js';
import type { OpenedComic } from '../domain/OpenedComic';
import type { OptimizeProgress } from '../domain/ArchiveRepository';
import type { PageQuality } from '../domain/PageQuality';
import { detectPageEncoding, encodeImage } from './encodeImage';

type ReadEntry = (entryPath: string, mimeType: string) => Promise<Blob>;

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot <= 0 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/**
 * Writes a new CBZ with every page downscaled and recompressed to `quality`. Pages are renamed
 * by position (0001, 0002…) so the reading order, and thus saved progress, stays identical.
 * A page keeps its original bytes when re-encoding would not make it smaller.
 */
export async function writeOptimizedArchive(
  comic: OpenedComic,
  quality: PageQuality,
  readEntry: ReadEntry,
  onProgress?: OptimizeProgress,
): Promise<Blob> {
  const encoding = await detectPageEncoding();
  const pages = comic.getPages().toArray();
  const digits = Math.max(4, String(pages.length).length);
  // Images are already compressed: storing them avoids burning time on deflate.
  const writer = new ZipWriter(new BlobWriter('application/zip'), {
    level: 0,
    useWebWorkers: false,
  });

  try {
    for (const [index, page] of pages.entries()) {
      const original = await readEntry(page.getPath(), page.getMimeType());
      const optimized = await encodeImage(original, {
        scaleFor: (width, height) => quality.scaleFor(width, height),
        type: encoding.type,
        quality: quality.getEncoderQuality(),
      });
      const keepOriginal = !optimized || optimized.size >= original.size;
      const extension = keepOriginal ? extensionOf(page.getFileName()) : encoding.extension;
      const name = `${String(index + 1).padStart(digits, '0')}.${extension}`;
      await writer.add(name, new BlobReader(keepOriginal ? original : optimized));
      onProgress?.(index + 1, pages.length);
    }

    const comicInfoPath = comic.getComicInfoPath();
    if (comicInfoPath) {
      const comicInfo = await readEntry(comicInfoPath, 'application/xml');
      await writer.add('ComicInfo.xml', new BlobReader(comicInfo));
    }
    return await writer.close();
  } catch (error) {
    await writer.close().catch(() => undefined);
    throw error;
  }
}
