import type { ArchiveRepository, OptimizeProgress } from '../domain/ArchiveRepository';
import type { OpenedComic } from '../domain/OpenedComic';
import type { PageQuality } from '../domain/PageQuality';

interface CreateOptimizedCopyProps {
  archiveRepository: ArchiveRepository;
}

/** A smaller CBZ of an opened comic: same pages and order, downscaled and recompressed. */
export function createOptimizedCopy({ archiveRepository }: CreateOptimizedCopyProps) {
  return (comic: OpenedComic, quality: PageQuality, onProgress?: OptimizeProgress): Promise<Blob> =>
    archiveRepository.createOptimizedCopy(comic, quality, onProgress);
}
