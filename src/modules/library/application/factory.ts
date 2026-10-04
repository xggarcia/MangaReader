import { getDb } from '../../../shared/infrastructure/db';
import { getArchiveUseCases } from '../../archive/application/factory';
import { getProgressRepository } from '../../reading/application/factory';
import type { ProgressRepository } from '../../reading/domain/ProgressRepository';
import type { CollectionRepository } from '../domain/CollectionRepository';
import type { ComicFileRepository } from '../domain/ComicFileRepository';
import type { ComicRepository } from '../domain/ComicRepository';
import type { CoverRepository } from '../domain/CoverRepository';
import type { DeviceFile } from '../domain/DeviceFile';
import type { DeviceFileRepository } from '../domain/DeviceFileRepository';
import type {
  LibraryExportReaderRepository,
  LibraryExportWriterRepository,
} from '../domain/LibraryExportRepository';
import { CapacitorDeviceFileRepository } from '../infrastructure/CapacitorDeviceFileRepository';
import { IdbCollectionRepository } from '../infrastructure/IdbCollectionRepository';
import { IdbComicFileRepository } from '../infrastructure/IdbComicFileRepository';
import { IdbComicRepository } from '../infrastructure/IdbComicRepository';
import { IdbCoverRepository } from '../infrastructure/IdbCoverRepository';
import { NativeLibraryExportReaderRepository } from '../infrastructure/NativeLibraryExportReaderRepository';
import { NativeLibraryExportWriterRepository } from '../infrastructure/NativeLibraryExportWriterRepository';
import { OpfsComicFileRepository } from '../infrastructure/OpfsComicFileRepository';
import {
  createCollection,
  deleteCollection,
  listCollections,
  setComicsInCollection,
  updateCollection,
} from './collections';
import {
  deleteOriginal,
  deviceFileSource,
  findNewInFolder,
  pickComicsFolder,
  pickDeviceFiles,
  saveExportedFile,
  shareExportedFile,
  takeReceivedFiles,
} from './deviceFiles';
import { getComicCover } from './getComicCover';
import { importComics } from './importComics';
import { exportLibrary, importLibraryExport } from './libraryExport';
import { listLibrary } from './listLibrary';
import { mergeSeries } from './mergeSeries';
import { openComicForReading } from './openComicForReading';
import { optimizeComic } from './optimizeComic';
import { removeComic } from './removeComic';
import { updateComicInfo } from './updateComicInfo';

interface LibraryDependencies {
  comicRepository: ComicRepository;
  comicFileRepository: ComicFileRepository;
  coverRepository: CoverRepository;
  progressRepository: ProgressRepository;
  collectionRepository: CollectionRepository;
  archive: ReturnType<typeof getArchiveUseCases>;
  deviceFileRepository: DeviceFileRepository;
  createExportWriter: () => LibraryExportWriterRepository;
  /** Opens an export file found on the device, or picked in the browser (web version). */
  openExportReader: (source: DeviceFile | Blob) => Promise<LibraryExportReaderRepository>;
}

export function createLibraryUseCases({
  comicRepository,
  comicFileRepository,
  coverRepository,
  progressRepository,
  collectionRepository,
  archive,
  deviceFileRepository,
  createExportWriter,
  openExportReader,
}: LibraryDependencies) {
  const exportRepositories = {
    comicRepository,
    comicFileRepository,
    coverRepository,
    progressRepository,
    collectionRepository,
  };
  return {
    importComics: importComics({
      comicRepository,
      comicFileRepository,
      coverRepository,
      openArchive: archive.openArchive,
      readCoverThumbnail: archive.readCoverThumbnail,
      readComicInfo: archive.readComicInfo,
      closeArchive: archive.closeArchive,
    }),
    listLibrary: listLibrary({ comicRepository, progressRepository }),
    removeComic: removeComic({
      comicRepository,
      comicFileRepository,
      coverRepository,
      progressRepository,
      collectionRepository,
    }),
    openComicForReading: openComicForReading({
      comicRepository,
      comicFileRepository,
      progressRepository,
      openArchive: archive.openArchive,
    }),
    optimizeComic: optimizeComic({
      comicRepository,
      comicFileRepository,
      openArchive: archive.openArchive,
      createOptimizedCopy: archive.createOptimizedCopy,
      closeArchive: archive.closeArchive,
    }),
    getComicCover: getComicCover({ coverRepository }),
    updateComicInfo: updateComicInfo({ comicRepository }),
    mergeSeries: mergeSeries({ comicRepository }),
    listCollections: listCollections({ collectionRepository }),
    createCollection: createCollection({ collectionRepository }),
    updateCollection: updateCollection({ collectionRepository }),
    deleteCollection: deleteCollection({ collectionRepository }),
    setComicsInCollection: setComicsInCollection({ collectionRepository }),
    findNewInFolder: findNewInFolder({ deviceFileRepository, comicRepository }),
    deviceFileSource: deviceFileSource({ deviceFileRepository }),
    deleteOriginal: deleteOriginal({ deviceFileRepository }),
    pickComicsFolder: pickComicsFolder({ deviceFileRepository }),
    pickDeviceFiles: pickDeviceFiles({ deviceFileRepository }),
    takeReceivedFiles: takeReceivedFiles({ deviceFileRepository }),
    shareExportedFile: shareExportedFile({ deviceFileRepository }),
    saveExportedFile: saveExportedFile({ deviceFileRepository }),
    exportLibrary: exportLibrary({ ...exportRepositories, createWriter: createExportWriter }),
    importLibraryExport: importLibraryExport(exportRepositories),
    openExportReader,
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
    collectionRepository: new IdbCollectionRepository(getDb),
    archive: getArchiveUseCases(),
    deviceFileRepository: new CapacitorDeviceFileRepository(),
    createExportWriter: () => new NativeLibraryExportWriterRepository(),
    openExportReader: async (source) => {
      if (!(source instanceof Blob)) return NativeLibraryExportReaderRepository.open(source);
      // Web version only: zip.js stays out of the main bundle until needed.
      const { ZipJsLibraryExportReaderRepository } =
        await import('../infrastructure/ZipJsLibraryExportReaderRepository');
      return ZipJsLibraryExportReaderRepository.open(source);
    },
  });
  return instance;
}
