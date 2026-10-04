import { create } from 'zustand';
import type { FolderContents } from '../modules/library/application/deviceFiles';
import { getLibraryUseCases } from '../modules/library/application/factory';
import type { DeviceFile } from '../modules/library/domain/DeviceFile';
import { hasDeviceFiles } from '../shared/infrastructure/deviceFiles';
import { useLibraryStore } from './libraryStore';
import { useOptimizationStore } from './optimizationStore';
import { useSettingsStore } from './settingsStore';
import { useTransferStore } from './transferStore';

interface DeviceFilesState {
  /** What is waiting in the comics folder; `null` until scanned or without a folder. */
  folder: FolderContents | null;
  /** The folder can no longer be read (moved, deleted or access revoked). */
  folderUnavailable: boolean;
  /** Files the user dismissed: the notice stays hidden until something new arrives. */
  dismissed: string | null;
  scanFolder: () => Promise<void>;
  chooseFolder: () => Promise<void>;
  dismissFolder: () => void;
  /** Imports comics from the device; their originals are deleted as the settings say. */
  importComics: (files: readonly DeviceFile[]) => Promise<void>;
  /**
   * Imports a library exported on another device. Once imported, the export file (a copy of a
   * whole library) is deleted like any original, or at least no longer offered.
   */
  importExportFile: (file: DeviceFile) => Promise<void>;
  /** "+" on Android: the system picker, so originals can be deleted after importing. */
  pickAndImport: () => Promise<void>;
  /** Files opened with the app or shared to it (Files, Quick Share…). */
  importReceived: () => Promise<void>;
}

/** Identifies a set of files, to tell whether anything changed since it was dismissed. */
export function folderSignature(folder: FolderContents): string {
  return [...folder.comics, ...folder.exports]
    .map((file) => file.getUri())
    .sort()
    .join('|');
}

export const useDeviceFilesStore = create<DeviceFilesState>((set, get) => {
  let scanning: Promise<void> | null = null;
  const importedExports = new Set<string>();

  /** Comics go to the library; library exports are imported whole. */
  const route = async (files: readonly DeviceFile[]) => {
    const exportFile = files.find((file) => file.isLibraryExport());
    const comics = files.filter((file) => !file.isLibraryExport());
    if (comics.length > 0) await get().importComics(comics);
    if (exportFile) void get().importExportFile(exportFile);
  };

  return {
    folder: null,
    folderUnavailable: false,
    dismissed: null,

    scanFolder: () => {
      const folder = useSettingsStore.getState().settings.getComicsFolder();
      if (!hasDeviceFiles() || !folder) {
        set({ folder: null, folderUnavailable: false });
        return Promise.resolve();
      }
      scanning ??= getLibraryUseCases()
        .findNewInFolder(folder.uri)
        .then((contents) =>
          set({
            folder: {
              ...contents,
              exports: contents.exports.filter((file) => !importedExports.has(file.getUri())),
            },
            folderUnavailable: false,
          }),
        )
        .catch(() => set({ folder: null, folderUnavailable: true }))
        .finally(() => {
          scanning = null;
        });
      return scanning;
    },

    chooseFolder: async () => {
      const folder = await getLibraryUseCases().pickComicsFolder();
      if (!folder) return;
      await useSettingsStore.getState().update({ comicsFolder: folder });
      set({ dismissed: null });
      await get().scanFolder();
    },

    dismissFolder: () => {
      const folder = get().folder;
      if (folder) set({ dismissed: folderSignature(folder) });
    },

    importComics: async (files) => {
      const library = getLibraryUseCases();
      const ids = await useLibraryStore
        .getState()
        .importSources(files.map(library.deviceFileSource));
      const originals = new Map<string, DeviceFile>();
      files.forEach((file, index) => {
        const id = ids[index];
        if (id) originals.set(id, file);
      });

      const settings = useSettingsStore.getState().settings;
      const mode = settings.getDeleteOriginals();
      const quality = settings.getImportOptimization();
      const deleteOriginal = (comicId: string) => {
        const file = originals.get(comicId);
        if (file) void library.deleteOriginal(file).then(() => get().scanFolder());
      };

      if (mode === 'always') originals.forEach((_, comicId) => deleteOriginal(comicId));
      if (quality) {
        useOptimizationStore.getState().enqueue([...originals.keys()], quality, (comicId, ok) => {
          if (ok && mode === 'afterReduce') deleteOriginal(comicId);
        });
      }
      await get().scanFolder();
    },

    importExportFile: async (file) => {
      if (!(await useTransferStore.getState().importExport(file))) return;
      importedExports.add(file.getUri());
      if (useSettingsStore.getState().settings.getDeleteOriginals() !== 'never') {
        await getLibraryUseCases().deleteOriginal(file);
      }
      await get().scanFolder();
    },

    pickAndImport: async () => {
      await route(await getLibraryUseCases().pickDeviceFiles());
    },

    importReceived: async () => {
      if (!hasDeviceFiles()) return;
      await route(await getLibraryUseCases().takeReceivedFiles());
    },
  };
});
