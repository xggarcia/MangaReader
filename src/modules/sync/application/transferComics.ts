import type { ImportResult, ImportSource } from '../../library/application/importComics';
import { Collection } from '../../library/domain/Collection';
import type { CollectionRepository } from '../../library/domain/CollectionRepository';
import type { Comic } from '../../library/domain/Comic';
import type { ComicRepository } from '../../library/domain/ComicRepository';
import { ReadingProgress } from '../../reading/domain/ReadingProgress';
import type { ProgressRepository } from '../../reading/domain/ProgressRepository';
import {
  alreadyHas,
  offeredComic,
  type OfferedCollection,
  type OfferedComic,
} from '../domain/TransferOffer';

export interface Offer {
  comics: OfferedComic[];
  collection: OfferedCollection | null;
}

function isOffered(comic: Comic, offered: OfferedComic): boolean {
  return (
    comic.getId() === offered.id ||
    comic.isSameFileAs({ name: offered.fileName, size: offered.fileSize })
  );
}

/**
 * What to send: the chosen comics that have their file here (cover-only records cannot be sent),
 * with their progress, and the collection they belong to when a whole collection is sent.
 */
export function buildOffer({
  comicRepository,
  progressRepository,
  collectionRepository,
}: {
  comicRepository: ComicRepository;
  progressRepository: ProgressRepository;
  collectionRepository: CollectionRepository;
}) {
  return async (comicIds: readonly string[], collectionId: string | null): Promise<Offer> => {
    const wanted = new Set(comicIds);
    const comics = (await comicRepository.findAll()).filter(
      (comic) => wanted.has(comic.getId()) && !comic.isArchived(),
    );
    const offered: OfferedComic[] = [];
    for (const comic of comics) {
      const progress = await progressRepository.findByComicId(comic.getId());
      offered.push(offeredComic(comic, progress?.toPrimitive() ?? null));
    }
    const collection = collectionId ? await collectionRepository.findById(collectionId) : null;
    return {
      comics: offered,
      collection: collection
        ? { id: collection.getId(), name: collection.getName(), color: collection.getColor() }
        : null,
    };
  };
}

/** Of the offered comics, the ones this device does not have yet (cover-only ones included). */
export function answerOffer({ comicRepository }: { comicRepository: ComicRepository }) {
  return async (comics: readonly OfferedComic[]): Promise<string[]> => {
    const library = await comicRepository.findAll();
    return comics
      .filter((offered) => !library.some((comic) => alreadyHas(comic, offered)))
      .map((offered) => offered.id);
  };
}

/**
 * Imports a comic received from a paired device, keeping what the sender knows about it: the
 * title, series and volume it has there, and its reading progress when newer. A cover-only record
 * of the same comic is restored instead of duplicated. Resolves whether it was imported.
 */
export function importReceivedComic({
  importComics,
  comicRepository,
  progressRepository,
}: {
  importComics: (sources: readonly ImportSource[]) => Promise<ImportResult[]>;
  comicRepository: ComicRepository;
  progressRepository: ProgressRepository;
}) {
  return async (offered: OfferedComic, file: Blob): Promise<boolean> => {
    // The original size keeps the comic recognisable on both devices even if it was reduced.
    const [result] = await importComics([
      { name: offered.fileName, size: offered.fileSize, read: () => Promise.resolve(file) },
    ]);
    if (result?.status !== 'imported') return false;

    let comic = result.comic;
    const info = { title: offered.title, series: offered.series, number: offered.number };
    if (
      comic.getTitle() !== info.title ||
      comic.getSeries() !== info.series ||
      comic.getNumber() !== info.number
    ) {
      comic = comic.withInfo(info);
      await comicRepository.save(comic);
    }

    if (offered.progress) {
      const local = await progressRepository.findByComicId(comic.getId());
      const incoming = ReadingProgress.fromPrimitive(offered.progress);
      if (!local || incoming.getUpdatedAt() > local.getUpdatedAt()) {
        const pageCount = comic.getPageCount();
        await progressRepository.save(
          ReadingProgress.create({
            ...incoming.toPrimitive(),
            comicId: comic.getId(),
            pageCount,
            currentPage: Math.min(incoming.getCurrentPage(), pageCount - 1),
          }),
        );
      }
    }
    return true;
  };
}

/**
 * The collection the comics were sent as: completed if it exists here (same id or name), created
 * otherwise, with every offered comic this device now has (sent or already here).
 */
export function receiveCollection({
  comicRepository,
  collectionRepository,
  now = Date.now,
}: {
  comicRepository: ComicRepository;
  collectionRepository: CollectionRepository;
  now?: () => number;
}) {
  return async (collection: OfferedCollection, comics: readonly OfferedComic[]): Promise<void> => {
    const library = await comicRepository.findAll();
    const comicIds = comics.flatMap((offered) => {
      const local = library.find((comic) => isOffered(comic, offered));
      return local ? [local.getId()] : [];
    });
    if (comicIds.length === 0) return;
    const name = collection.name.toLocaleLowerCase();
    const existing = (await collectionRepository.findAll()).find(
      (candidate) =>
        candidate.getId() === collection.id || candidate.getName().toLocaleLowerCase() === name,
    );
    await collectionRepository.save(
      existing
        ? existing.addComics(comicIds)
        : Collection.create({ ...collection, comicIds, createdAt: now() }),
    );
  };
}
