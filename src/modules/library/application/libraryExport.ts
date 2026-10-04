import { ReadingProgress } from '../../reading/domain/ReadingProgress';
import type { ProgressRepository } from '../../reading/domain/ProgressRepository';
import { Collection } from '../domain/Collection';
import type { CollectionRepository } from '../domain/CollectionRepository';
import type { Comic } from '../domain/Comic';
import type { ComicFileRepository } from '../domain/ComicFileRepository';
import type { ComicRepository } from '../domain/ComicRepository';
import type { CoverRepository } from '../domain/CoverRepository';
import type { ExportedFile } from '../domain/DeviceFileRepository';
import { LIBRARY_EXPORT_PATHS, LibraryExport } from '../domain/LibraryExport';
import { LibraryError } from '../domain/LibraryError';
import type {
  LibraryExportReaderRepository,
  LibraryExportWriterRepository,
} from '../domain/LibraryExportRepository';
import type { ImportProgress } from './importComics';

interface LibraryExportProps {
  comicRepository: ComicRepository;
  comicFileRepository: ComicFileRepository;
  coverRepository: CoverRepository;
  progressRepository: ProgressRepository;
  collectionRepository: CollectionRepository;
}

export interface ExportProgress {
  /** Bytes written so far, out of `total`. */
  done: number;
  total: number;
}

export interface LibraryImportResult {
  imported: number;
  /** Comics that were already in this library. */
  skipped: number;
}

/**
 * Writes the library (or some comics of it) into one file to move it to another device: the
 * comic files as stored, their covers, reading progress and collections.
 */
export function exportLibrary({
  comicRepository,
  comicFileRepository,
  coverRepository,
  progressRepository,
  collectionRepository,
  createWriter,
  now = Date.now,
}: LibraryExportProps & { createWriter: () => LibraryExportWriterRepository; now?: () => number }) {
  return async (
    options: { comicIds?: readonly string[]; label?: string; signal?: AbortSignal },
    onProgress?: (progress: ExportProgress) => void,
  ): Promise<ExportedFile> => {
    const wanted = options.comicIds ? new Set(options.comicIds) : null;
    const comics = (await comicRepository.findAll()).filter(
      (comic) => !wanted || wanted.has(comic.getId()),
    );
    const files = new Map<string, Blob>();
    for (const comic of comics) {
      const file = await comicFileRepository.get(comic.getId());
      if (file) files.set(comic.getId(), file);
    }
    // Archived comics travel too: only their cover and reading record.
    const exported = comics.filter((comic) => files.has(comic.getId()) || comic.isArchived());
    if (exported.length === 0) throw new Error('[exportLibrary] There are no comics to export');

    const exportedAt = now();
    const manifest = LibraryExport.create({
      exportedAt,
      comics: exported,
      progress: await progressRepository.findAll(),
      collections: await collectionRepository.findAll(),
    });
    const total = [...files.values()].reduce((sum, file) => sum + file.size, 0);
    let done = 0;

    const writer = createWriter();
    await writer.begin(LibraryExport.fileName(exportedAt, options.label));
    try {
      await writer.addEntry(
        LIBRARY_EXPORT_PATHS.manifest,
        new Blob([manifest.toJson()], { type: 'application/json' }),
      );
      for (const comic of manifest.getComics()) {
        options.signal?.throwIfAborted();
        const comicId = comic.getId();
        const cover = await coverRepository.get(comicId);
        if (cover) await writer.addEntry(LIBRARY_EXPORT_PATHS.cover(comicId), cover);
        const file = files.get(comicId);
        if (!file) continue;
        await writer.addEntry(LIBRARY_EXPORT_PATHS.comic(comicId), file, (bytes) => {
          options.signal?.throwIfAborted();
          done += bytes;
          onProgress?.({ done, total });
        });
      }
      return await writer.finish();
    } catch (error) {
      await writer.abort().catch(() => undefined);
      throw error;
    }
  };
}

/**
 * Adds a library exported from another device. Comics already here (same comic or same file)
 * are skipped but keep the newer reading progress; collections are merged by id or name.
 */
export function importLibraryExport({
  comicRepository,
  comicFileRepository,
  coverRepository,
  progressRepository,
  collectionRepository,
}: LibraryExportProps) {
  async function keepNewerProgress(progress: ReadingProgress, localId: string): Promise<void> {
    const local = await progressRepository.findByComicId(localId);
    if (local && local.getLastReadAt() >= progress.getLastReadAt()) return;
    await progressRepository.save(
      ReadingProgress.create({ ...progress.toPrimitive(), comicId: localId }),
    );
  }

  async function mergeCollections(
    manifest: LibraryExport,
    localIdOf: ReadonlyMap<string, string>,
  ): Promise<void> {
    const current = await collectionRepository.findAll();
    for (const collection of manifest.getCollections()) {
      const comicIds = collection.getComicIds().flatMap((id) => localIdOf.get(id) ?? []);
      if (comicIds.length === 0) continue;
      const name = collection.getName().toLocaleLowerCase();
      const match =
        current.find((local) => local.getId() === collection.getId()) ??
        current.find((local) => local.getName().toLocaleLowerCase() === name);
      await collectionRepository.save(
        match
          ? match.addComics(comicIds)
          : Collection.create({ ...collection.toPrimitive(), comicIds }),
      );
    }
  }

  return async (
    reader: LibraryExportReaderRepository,
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<LibraryImportResult> => {
    try {
      const first = await reader.next();
      if (!first || LibraryExport.parseEntryPath(first.path)?.kind !== 'manifest') {
        throw new LibraryError('invalidExport', '[importLibraryExport] Missing manifest');
      }
      const manifest = LibraryExport.fromJson(await (await first.read()).text());
      const library = await comicRepository.findAll();

      // Exported comic id -> id in this library, for comics already here.
      const localIdOf = new Map<string, string>();
      const incoming = new Map<string, Comic>();
      // Comics kept here only as a reading record whose file comes in the export.
      const restoring = new Map<string, Comic>();
      for (const comic of manifest.getComics()) {
        const local = library.find(
          (candidate) =>
            candidate.equals(comic) ||
            candidate.isSameFileAs({ name: comic.getFileName(), size: comic.getFileSize() }),
        );
        if (local) localIdOf.set(comic.getId(), local.getId());
        else incoming.set(comic.getId(), comic);
        if (local?.isArchived() && !comic.isArchived()) restoring.set(comic.getId(), local);
      }

      const total = manifest.getComics().length;
      let done = total - incoming.size;
      onProgress?.({ done, total });
      const covers = new Map<string, Blob>();
      for (let entry = await reader.next(); entry; entry = await reader.next()) {
        const path = LibraryExport.parseEntryPath(entry.path);
        if (!path || path.kind === 'manifest') continue;
        const archivedHere = restoring.get(path.comicId);
        if (archivedHere && path.kind === 'comic') {
          const file = await entry.read();
          const exported = manifest.getComics().find((comic) => comic.getId() === path.comicId);
          await comicFileRepository.save(archivedHere.getId(), file);
          await comicRepository.save(
            archivedHere.restore({
              size: file.size,
              format: exported?.toPrimitive().format ?? archivedHere.toPrimitive().format,
            }),
          );
          continue;
        }
        const comic = incoming.get(path.comicId);
        if (!comic) continue;
        if (path.kind === 'cover') {
          covers.set(path.comicId, await entry.read());
          continue;
        }

        const comicId = comic.getId();
        await comicFileRepository.save(comicId, await entry.read());
        try {
          const cover = covers.get(comicId);
          if (cover) await coverRepository.save(comicId, cover);
          await comicRepository.save(comic);
          const progress = manifest.getProgressFor(comicId);
          if (progress) await progressRepository.save(progress);
        } catch (error) {
          await comicFileRepository.delete(comicId).catch(() => undefined);
          await coverRepository.delete(comicId).catch(() => undefined);
          throw error;
        }
        covers.delete(comicId);
        localIdOf.set(comicId, comicId);
        onProgress?.({ done: ++done, total });
      }

      // Archived comics have no file entry: their cover and reading record are all there is.
      for (const comic of incoming.values()) {
        if (!comic.isArchived() || localIdOf.has(comic.getId())) continue;
        const comicId = comic.getId();
        const cover = covers.get(comicId);
        if (cover) await coverRepository.save(comicId, cover);
        await comicRepository.save(comic);
        const progress = manifest.getProgressFor(comicId);
        if (progress) await progressRepository.save(progress);
        localIdOf.set(comicId, comicId);
        onProgress?.({ done: ++done, total });
      }

      for (const comic of manifest.getComics()) {
        const progress = manifest.getProgressFor(comic.getId());
        const localId = localIdOf.get(comic.getId());
        if (progress && localId && !incoming.has(comic.getId())) {
          await keepNewerProgress(progress, localId);
        }
      }
      await mergeCollections(manifest, localIdOf);

      const imported = [...incoming.keys()].filter((id) => localIdOf.has(id)).length;
      return { imported, skipped: total - imported };
    } finally {
      await reader.close();
    }
  };
}
