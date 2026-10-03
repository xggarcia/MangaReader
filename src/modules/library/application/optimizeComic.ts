import type { OptimizeProgress } from '../../archive/domain/ArchiveRepository';
import type { OpenedComic } from '../../archive/domain/OpenedComic';
import type { PageQuality } from '../../archive/domain/PageQuality';
import type { Comic } from '../domain/Comic';
import type { ComicFileRepository } from '../domain/ComicFileRepository';
import type { ComicRepository } from '../domain/ComicRepository';
import { LibraryError } from '../domain/LibraryError';

/** The optimized copy replaces the stored file only when it saves at least 10%. */
const MAX_SIZE_RATIO = 0.9;

export type OptimizeResult =
  | { status: 'optimized'; comic: Comic; savedBytes: number }
  /** Already at this quality, or recompressing would barely save space. */
  | { status: 'unchanged'; comic: Comic };

interface OptimizeComicProps {
  comicRepository: ComicRepository;
  comicFileRepository: ComicFileRepository;
  openArchive: (file: Blob) => Promise<OpenedComic>;
  createOptimizedCopy: (
    comic: OpenedComic,
    quality: PageQuality,
    onProgress?: OptimizeProgress,
  ) => Promise<Blob>;
  closeArchive: (comic: OpenedComic) => Promise<void>;
}

/**
 * Shrinks a comic's private copy by downscaling and recompressing its pages. The original is
 * replaced only after the new archive is complete and has the same pages, so reading progress,
 * collections and the cover stay valid; on any failure the stored file is left untouched.
 */
export function optimizeComic({
  comicRepository,
  comicFileRepository,
  openArchive,
  createOptimizedCopy,
  closeArchive,
}: OptimizeComicProps) {
  async function countPages(file: Blob): Promise<number> {
    const opened = await openArchive(file);
    await closeArchive(opened);
    return opened.getPages().count();
  }

  return async (
    comicId: string,
    quality: PageQuality,
    onProgress?: OptimizeProgress,
  ): Promise<OptimizeResult> => {
    const comic = await comicRepository.findById(comicId);
    if (!comic) throw new LibraryError('notFound', `[optimizeComic] Unknown comic: ${comicId}`);
    if (comic.isOptimizedAs(quality)) return { status: 'unchanged', comic };

    const file = await comicFileRepository.get(comicId);
    if (!file) throw new LibraryError('notFound', `[optimizeComic] File missing: ${comicId}`);

    const opened = await openArchive(file);
    let copy: Blob;
    try {
      copy = await createOptimizedCopy(opened, quality, onProgress);
    } finally {
      await closeArchive(opened);
    }

    // Re-read it: it may have been edited, or removed, while its pages were being processed.
    const latest = await comicRepository.findById(comicId);
    if (!latest) {
      throw new LibraryError('notFound', `[optimizeComic] Removed while optimizing: ${comicId}`);
    }

    if (copy.size > file.size * MAX_SIZE_RATIO) {
      const unchanged = latest.withOptimizedCopy({
        quality,
        storedSize: file.size,
        format: latest.toPrimitive().format,
      });
      await comicRepository.save(unchanged);
      return { status: 'unchanged', comic: unchanged };
    }

    if ((await countPages(copy)) !== opened.getPages().count()) {
      throw new Error(`[optimizeComic] Optimized copy has a different page count: ${comicId}`);
    }

    await comicFileRepository.save(comicId, copy);
    const optimized = latest.withOptimizedCopy({ quality, storedSize: copy.size, format: 'zip' });
    await comicRepository.save(optimized);
    return { status: 'optimized', comic: optimized, savedBytes: file.size - copy.size };
  };
}
