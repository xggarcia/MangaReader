import { ArchiveError, type ArchiveErrorCode } from '../../archive/domain/ArchiveError';
import type { ComicInfo } from '../../archive/domain/ComicInfo';
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

/**
 * Something to import, read only when its turn comes: a picked File, or a file in the comics
 * folder that is copied in on demand (so hundreds of volumes are never held at once).
 */
export interface ImportSource {
  name: string;
  size: number;
  read: () => Promise<Blob>;
}

/** A picked or dropped File as an import source. */
export function fileSource(file: File): ImportSource {
  return { name: file.name, size: file.size, read: () => Promise.resolve(file) };
}

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
  readComicInfo: (comic: OpenedComic) => Promise<ComicInfo | null>;
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
  readComicInfo,
  closeArchive,
  generateId = () => crypto.randomUUID(),
  now = Date.now,
}: ImportComicsProps) {
  async function importOne(source: ImportSource, existing: Comic[]): Promise<Comic> {
    if (existing.some((comic) => comic.isSameFileAs(source))) {
      throw new LibraryError('duplicate', `[importComics] Already in library: ${source.name}`);
    }

    const file = await source.read();
    const opened = await openArchive(file);
    let cover: Blob | null = null;
    let info: ComicInfo | null = null;
    try {
      cover = await readCoverThumbnail(opened).catch(() => null);
      info = await readComicInfo(opened);
    } finally {
      await closeArchive(opened);
    }

    const comic = Comic.create({
      id: generateId(),
      title: info?.getTitle() ?? Comic.titleFromFileName(source.name),
      series: info?.getSeries() ?? null,
      number: info?.getNumber() ?? null,
      author: info?.getWriter() ?? null,
      fileName: source.name,
      fileSize: source.size || file.size,
      storedSize: file.size,
      optimizedQuality: null,
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

  /** One result per source, in the same order. */
  return async (
    sources: readonly ImportSource[],
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<ImportResult[]> => {
    const existing = await comicRepository.findAll();
    const results: ImportResult[] = [];

    for (const [index, source] of sources.entries()) {
      try {
        const comic = await importOne(source, existing);
        existing.push(comic);
        results.push({ status: 'imported', fileName: source.name, comic });
      } catch (error) {
        results.push({ status: 'failed', fileName: source.name, code: errorCodeOf(error) });
      }
      onProgress?.({ done: index + 1, total: sources.length });
    }
    return results;
  };
}
