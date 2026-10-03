import { create } from 'zustand';
import type { ImportErrorCode, ImportProgress } from '../modules/library/application/importComics';
import { getLibraryUseCases } from '../modules/library/application/factory';
import type { Comic } from '../modules/library/domain/Comic';
import { LibraryItem } from '../modules/library/domain/LibraryItem';
import {
  LibraryItemList,
  type LibraryFilter,
  type LibrarySortOrder,
} from '../modules/library/domain/LibraryItemList';
import type { ComicInfoChanges } from '../modules/library/application/updateComicInfo';
import { coverUrlCache } from '../hooks/coverUrlCache';
import { getReadingUseCases } from '../modules/reading/application/factory';
import { requestPersistentStorage } from '../shared/infrastructure/storageErrors';

export interface ImportFailure {
  fileName: string;
  code: ImportErrorCode;
}

interface LibraryState {
  items: LibraryItemList;
  status: 'idle' | 'loading' | 'ready' | 'error';
  importProgress: ImportProgress | null;
  importFailures: ImportFailure[];
  query: string;
  sortOrder: LibrarySortOrder;
  filter: LibraryFilter;
  groupSeries: boolean;
  load: () => Promise<void>;
  /** Resolves with the ids of the comics that were imported. */
  importFiles: (files: readonly File[]) => Promise<string[]>;
  /** Reflects a comic changed elsewhere (e.g. optimized), keeping its progress. */
  replaceComic: (comic: Comic) => void;
  remove: (comicId: string) => Promise<void>;
  setReadStatus: (comicId: string, isRead: boolean) => Promise<void>;
  setQuery: (query: string) => void;
  setSortOrder: (sortOrder: LibrarySortOrder) => void;
  setFilter: (filter: LibraryFilter) => void;
  setGroupSeries: (groupSeries: boolean) => void;
  updateInfo: (comicId: string, changes: ComicInfoChanges) => Promise<void>;
  setReadStatusMany: (comicIds: readonly string[], isRead: boolean) => Promise<void>;
  removeMany: (comicIds: readonly string[]) => Promise<void>;
  dismissImportFailures: () => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  items: LibraryItemList.empty(),
  status: 'idle',
  importProgress: null,
  importFailures: [],
  query: '',
  sortOrder: 'lastRead',
  filter: 'all',
  groupSeries: true,

  load: async () => {
    if (get().status === 'idle') set({ status: 'loading' });
    try {
      set({ items: await getLibraryUseCases().listLibrary(), status: 'ready' });
    } catch {
      set({ status: 'error' });
    }
  },

  importFiles: async (files) => {
    if (files.length === 0 || get().importProgress) return [];
    void requestPersistentStorage();
    set({ importProgress: { done: 0, total: files.length }, importFailures: [] });

    const results = await getLibraryUseCases().importComics(files, (importProgress) =>
      set({ importProgress }),
    );

    let items = get().items;
    const importFailures: ImportFailure[] = [];
    for (const result of results) {
      if (result.status === 'imported') {
        items = items.add(LibraryItem.create({ comic: result.comic, progress: null }));
      } else {
        importFailures.push({ fileName: result.fileName, code: result.code });
      }
    }
    set({ items, importFailures, importProgress: null, status: 'ready' });
    return results.flatMap((result) =>
      result.status === 'imported' ? [result.comic.getId()] : [],
    );
  },

  replaceComic: (comic) => {
    const item = get().items.findById(comic.getId());
    if (!item) return;
    set({ items: get().items.update(LibraryItem.create({ comic, progress: item.getProgress() })) });
  },

  remove: async (comicId) => {
    await getLibraryUseCases().removeComic(comicId);
    coverUrlCache.forget(comicId);
    set({ items: get().items.remove(comicId) });
  },

  removeMany: async (comicIds) => {
    for (const comicId of comicIds) await get().remove(comicId);
  },

  updateInfo: async (comicId, changes) => {
    const item = get().items.findById(comicId);
    if (!item) return;
    const comic = await getLibraryUseCases().updateComicInfo(comicId, changes);
    set({
      items: get().items.update(LibraryItem.create({ comic, progress: item.getProgress() })),
    });
  },

  setReadStatusMany: async (comicIds, isRead) => {
    for (const comicId of comicIds) await get().setReadStatus(comicId, isRead);
  },

  setReadStatus: async (comicId, isRead) => {
    const item = get().items.findById(comicId);
    if (!item) return;
    const progress = await getReadingUseCases().setReadStatus({
      comicId,
      isRead,
      pageCount: item.getComic().getPageCount(),
    });
    set({ items: get().items.update(item.withProgress(progress)) });
  },

  setQuery: (query) => set({ query }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setFilter: (filter) => set({ filter }),
  setGroupSeries: (groupSeries) => set({ groupSeries }),
  dismissImportFailures: () => set({ importFailures: [] }),
}));
