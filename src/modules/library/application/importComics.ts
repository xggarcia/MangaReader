import { ArchiveError, type ArchiveErrorCode } from '../../archive/domain/ArchiveError';
import type { OpenedComic } from '../../archive/domain/OpenedComic';
import { Comic } from '../domain/Comic';
import type { ComicFileRepository } from '../domain/ComicFileRepository';
import type { ComicRepository } from '../domain/ComicRepository';
import type { CoverRepository } from '../domain/CoverRepository';
import { LibraryError, type LibraryErrorCode } from '../domain/LibraryError';

export type ImportErrorCode = ArchiveErrorCode | LibraryErrorCode | 'unknown';

export type ImportResult =
  | { status: 'imported'; fileName: string; comic: Comic }
  | { status: 'failed'; fileName: string; code: ImportErrorCode };

export interface ImportProgress {
  done: number;
  total: number;
}

interface ImportComicsProps {
  comicRepository: ComicRepository;
  comicFileRepository: ComicFileRepository;
  coverRepository: CoverRepository;
  openArchive: (file: Blob) => Promise<OpenedComic>;
  readCoverThumbnail: (comic: OpenedComic) => Promise<Blob>;
  closeArchive: (comic: OpenedComic) => Promise<void>;
  generateId?: () => string;
  now?: () => number;
}

function errorCodeOf(error: unknown): ImportErrorCode {
  if (ArchiveError.isArchiveError(error) || LibraryError.isLibraryError(error)) return error.code;
  return 'unknown';
}

/**
 * Adds comic files to the library: validates each archive, keeps a private copy, extracts its
 * cover and stores its metadata. Files are processed one by one; a failure never stops the rest.
 */
export function importComics({
  comicRepository,
  comicFileRepository,
  coverRepository,
  openArchive,
  readCoverThumbnail,
  closeArchive,
  generateId = () => crypto.randomUUID(),
  now = Date.now,
}: ImportComicsProps) {
  async function importOne(file: File, existing: Comic[]): Promise<Comic> {
    if (existing.some((comic) => comic.isSameFileAs(file))) {
      throw new LibraryError('duplicate', `[importComics] Already in library: ${file.name}`);
    }

    const opened = await openArchive(file);
    let cover: Blob | null = null;
    try {
      cover = await readCoverThumbnail(opened).catch(() => null);
    } finally {
      await closeArchive(opened);
    }

    const comic = Comic.create({
      id: generateId(),
      title: Comic.titleFromFileName(file.name),
      series: null,
      number: null,
      author: null,
      fileName: file.name,
      fileSize: file.size,
      format: opened.getFormat().toPrimitive(),
      pageCount: opened.getPages().count(),
      addedAt: now(),
    });

    await comicFileRepository.save(comic.getId(), file);
    try {
      if (cover) await coverRepository.save(comic.getId(), cover);
      await comicRepository.save(comic);
    } catch (error) {
      await comicFileRepository.delete(comic.getId()).catch(() => undefined);
      await coverRepository.delete(comic.getId()).catch(() => undefined);
      throw error;
    }
    return comic;
  }

  return async (
    files: readonly File[],
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<ImportResult[]> => {
    const existing = await comicRepository.findAll();
    const results: ImportResult[] = [];

    for (const [index, file] of files.entries()) {
      try {
        const comic = await importOne(file, existing);
        existing.push(comic);
        results.push({ status: 'imported', fileName: file.name, comic });
      } catch (error) {
        results.push({ status: 'failed', fileName: file.name, code: errorCodeOf(error) });
      }
      onProgress?.({ done: index + 1, total: files.length });
    }
    return results;
  };
}
