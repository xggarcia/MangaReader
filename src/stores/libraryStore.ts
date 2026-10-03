import { create } from 'zustand';
import type { ImportErrorCode, ImportProgress } from '../modules/library/application/importComics';
import { getLibraryUseCases } from '../modules/library/application/factory';
import { LibraryItem } from '../modules/library/domain/LibraryItem';
import { LibraryItemList, type LibrarySortOrder } from '../modules/library/domain/LibraryItemList';
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
  load: () => Promise<void>;
  importFiles: (files: readonly File[]) => Promise<void>;
  remove: (comicId: string) => Promise<void>;
  setReadStatus: (comicId: string, isRead: boolean) => Promise<void>;
  setQuery: (query: string) => void;
  setSortOrder: (sortOrder: LibrarySortOrder) => void;
  dismissImportFailures: () => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  items: LibraryItemList.empty(),
  status: 'idle',
  importProgress: null,
  importFailures: [],
  query: '',
  sortOrder: 'lastRead',

  load: async () => {
    if (get().status === 'idle') set({ status: 'loading' });
    try {
      set({ items: await getLibraryUseCases().listLibrary(), status: 'ready' });
    } catch {
      set({ status: 'error' });
    }
  },

  importFiles: async (files) => {
    if (files.length === 0 || get().importProgress) return;
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
  },

  remove: async (comicId) => {
    await getLibraryUseCases().removeComic(comicId);
    set({ items: get().items.remove(comicId) });
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
  dismissImportFailures: () => set({ importFailures: [] }),
}));
