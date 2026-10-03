import { Collection, type CollectionColor } from '../domain/Collection';
import type { CollectionRepository } from '../domain/CollectionRepository';
import { LibraryError } from '../domain/LibraryError';

interface CollectionUseCaseProps {
  collectionRepository: CollectionRepository;
}

async function findOrFail(
  collectionRepository: CollectionRepository,
  id: string,
  useCase: string,
): Promise<Collection> {
  const collection = await collectionRepository.findById(id);
  if (!collection) throw new LibraryError('notFound', `[${useCase}] Unknown collection: ${id}`);
  return collection;
}

/** Collections ordered by creation, newest last (Panels shows them as the user made them). */
export function listCollections({ collectionRepository }: CollectionUseCaseProps) {
  return async (): Promise<Collection[]> =>
    (await collectionRepository.findAll()).sort((a, b) => a.getCreatedAt() - b.getCreatedAt());
}

export function createCollection({
  collectionRepository,
  generateId = () => crypto.randomUUID(),
  now = Date.now,
}: CollectionUseCaseProps & { generateId?: () => string; now?: () => number }) {
  return async (props: {
    name: string;
    color: CollectionColor;
    comicIds?: readonly string[];
  }): Promise<Collection> => {
    const collection = Collection.create({
      id: generateId(),
      name: props.name,
      color: props.color,
      comicIds: [...(props.comicIds ?? [])],
      createdAt: now(),
    });
    await collectionRepository.save(collection);
    return collection;
  };
}

export function updateCollection({ collectionRepository }: CollectionUseCaseProps) {
  return async (
    id: string,
    changes: { name?: string; color?: CollectionColor },
  ): Promise<Collection> => {
    let collection = await findOrFail(collectionRepository, id, 'updateCollection');
    if (changes.name !== undefined) collection = collection.rename(changes.name);
    if (changes.color !== undefined) collection = collection.withColor(changes.color);
    await collectionRepository.save(collection);
    return collection;
  };
}

/** Deletes the collection only; its comics stay in the library. */
export function deleteCollection({ collectionRepository }: CollectionUseCaseProps) {
  return async (id: string): Promise<void> => {
    await collectionRepository.delete(id);
  };
}

/** Adds or removes one comic from a collection (the "Add to collection" checklist). */
export function setComicInCollection({ collectionRepository }: CollectionUseCaseProps) {
  return async (props: {
    collectionId: string;
    comicId: string;
    included: boolean;
  }): Promise<Collection> => {
    const collection = await findOrFail(
      collectionRepository,
      props.collectionId,
      'setComicInCollection',
    );
    const updated = props.included
      ? collection.addComics([props.comicId])
      : collection.removeComic(props.comicId);
    await collectionRepository.save(updated);
    return updated;
  };
}
