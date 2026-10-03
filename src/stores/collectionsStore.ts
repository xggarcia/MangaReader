import { create } from 'zustand';
import { getLibraryUseCases } from '../modules/library/application/factory';
import type { Collection, CollectionColor } from '../modules/library/domain/Collection';

interface CollectionsState {
  collections: Collection[];
  loaded: boolean;
  load: () => Promise<void>;
  create: (props: {
    name: string;
    color: CollectionColor;
    comicIds?: string[];
  }) => Promise<Collection>;
  update: (id: string, changes: { name?: string; color?: CollectionColor }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setComicsIncluded: (
    collectionId: string,
    comicIds: readonly string[],
    included: boolean,
  ) => Promise<void>;
}

function replace(collections: Collection[], updated: Collection): Collection[] {
  return collections.map((collection) => (collection.equals(updated) ? updated : collection));
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  loaded: false,

  load: async () => {
    set({ collections: await getLibraryUseCases().listCollections(), loaded: true });
  },

  create: async (props) => {
    const collection = await getLibraryUseCases().createCollection(props);
    set({ collections: [...get().collections, collection] });
    return collection;
  },

  update: async (id, changes) => {
    const updated = await getLibraryUseCases().updateCollection(id, changes);
    set({ collections: replace(get().collections, updated) });
  },

  remove: async (id) => {
    await getLibraryUseCases().deleteCollection(id);
    set({ collections: get().collections.filter((collection) => collection.getId() !== id) });
  },

  setComicsIncluded: async (collectionId, comicIds, included) => {
    const updated = await getLibraryUseCases().setComicsInCollection({
      collectionId,
      comicIds,
      included,
    });
    set({ collections: replace(get().collections, updated) });
  },
}));
