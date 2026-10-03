import { getDb } from '../../../shared/infrastructure/db';
import { getArchiveUseCases } from '../../archive/application/factory';
import { getProgressRepository } from '../../reading/application/factory';
import type { ProgressRepository } from '../../reading/domain/ProgressRepository';
import type { ComicFileRepository } from '../domain/ComicFileRepository';
import type { ComicRepository } from '../domain/ComicRepository';
import type { CoverRepository } from '../domain/CoverRepository';
import { IdbComicFileRepository } from '../infrastructure/IdbComicFileRepository';
import { IdbComicRepository } from '../infrastructure/IdbComicRepository';
import { IdbCoverRepository } from '../infrastructure/IdbCoverRepository';
import { OpfsComicFileRepository } from '../infrastructure/OpfsComicFileRepository';
import { getComicCover } from './getComicCover';
import { importComics } from './importComics';
import { listLibrary } from './listLibrary';
import { openComicForReading } from './openComicForReading';
import { removeComic } from './removeComic';

interface LibraryDependencies {
  comicRepository: ComicRepository;
  comicFileRepository: ComicFileRepository;
  coverRepository: CoverRepository;
  progressRepository: ProgressRepository;
  archive: ReturnType<typeof getArchiveUseCases>;
}

export function createLibraryUseCases({
  comicRepository,
  comicFileRepository,
  coverRepository,
  progressRepository,
  archive,
}: LibraryDependencies) {
  return {
    importComics: importComics({
      comicRepository,
      comicFileRepository,
      coverRepository,
      openArchive: archive.openArchive,
      readCoverThumbnail: archive.readCoverThumbnail,
      closeArchive: archive.closeArchive,
    }),
    listLibrary: listLibrary({ comicRepository, progressRepository }),
    removeComic: removeComic({
      comicRepository,
      comicFileRepository,
      coverRepository,
      progressRepository,
    }),
    openComicForReading: openComicForReading({
      comicRepository,
      comicFileRepository,
      progressRepository,
      openArchive: archive.openArchive,
    }),
    getComicCover: getComicCover({ coverRepository }),
  };
}

export type LibraryUseCases = ReturnType<typeof createLibraryUseCases>;

let instance: LibraryUseCases | null = null;

export function getLibraryUseCases(): LibraryUseCases {
  instance ??= createLibraryUseCases({
    comicRepository: new IdbComicRepository(getDb),
    // OPFS when the WebView supports it; IndexedDB blobs otherwise.
    comicFileRepository: OpfsComicFileRepository.isSupported()
      ? new OpfsComicFileRepository()
      : new IdbComicFileRepository(getDb),
    coverRepository: new IdbCoverRepository(getDb),
    progressRepository: getProgressRepository(),
    archive: getArchiveUseCases(),
  });
  return instance;
}
