import { create } from 'zustand';
import { getLibraryUseCases } from '../modules/library/application/factory';
import type { LibraryImportResult } from '../modules/library/application/libraryExport';
import type { DeviceFile } from '../modules/library/domain/DeviceFile';
import type { ExportedFile } from '../modules/library/domain/DeviceFileRepository';
import { LibraryError, type LibraryErrorCode } from '../modules/library/domain/LibraryError';
import { setKeepScreenOn } from '../shared/infrastructure/screenWakeLock';
import { useCollectionsStore } from './collectionsStore';
import { useLibraryStore } from './libraryStore';
import { useSettingsStore } from './settingsStore';

export type TransferErrorCode = LibraryErrorCode | 'unknown';

export type ExportState =
  | { status: 'idle' }
  | { status: 'running'; done: number; total: number }
  | { status: 'done'; file: ExportedFile; savedToFolder: boolean }
  | { status: 'error'; code: TransferErrorCode };

export type ImportState =
  | { status: 'idle' }
  | { status: 'running'; done: number; total: number }
  | { status: 'done'; result: LibraryImportResult }
  | { status: 'error'; code: TransferErrorCode };

interface TransferState {
  exporting: ExportState;
  importing: ImportState;
  /** Writes the library (or some comics) into one file to move it to another device. */
  exportLibrary: (options?: { comicIds?: readonly string[]; label?: string }) => Promise<void>;
  cancelExport: () => void;
  shareExport: (title: string) => Promise<void>;
  saveExportToFolder: () => Promise<void>;
  resetExport: () => void;
  /**
   * Adds a library exported on another device (a file on the device, or picked on the web).
   * Resolves whether it was imported.
   */
  importExport: (source: DeviceFile | File) => Promise<boolean>;
  resetImport: () => void;
}

function errorCodeOf(error: unknown): TransferErrorCode {
  return LibraryError.isLibraryError(error) ? error.code : 'unknown';
}

export const useTransferStore = create<TransferState>((set, get) => {
  let exportAbort: AbortController | null = null;

  return {
    exporting: { status: 'idle' },
    importing: { status: 'idle' },

    exportLibrary: async (options = {}) => {
      if (get().exporting.status === 'running') return;
      exportAbort = new AbortController();
      set({ exporting: { status: 'running', done: 0, total: 0 } });
      void setKeepScreenOn(true);
      try {
        const file = await getLibraryUseCases().exportLibrary(
          { ...options, signal: exportAbort.signal },
          ({ done, total }) => set({ exporting: { status: 'running', done, total } }),
        );
        set({ exporting: { status: 'done', file, savedToFolder: false } });
      } catch (error) {
        set({
          exporting: exportAbort.signal.aborted
            ? { status: 'idle' }
            : { status: 'error', code: errorCodeOf(error) },
        });
      } finally {
        exportAbort = null;
        void setKeepScreenOn(false);
      }
    },

    cancelExport: () => exportAbort?.abort(),

    shareExport: async (title) => {
      const state = get().exporting;
      if (state.status === 'done') await getLibraryUseCases().shareExportedFile(state.file, title);
    },

    saveExportToFolder: async () => {
      const state = get().exporting;
      const folder = useSettingsStore.getState().settings.getComicsFolder();
      if (state.status !== 'done' || !folder) return;
      try {
        await getLibraryUseCases().saveExportedFile(state.file, folder.uri);
        set({ exporting: { ...state, savedToFolder: true } });
      } catch (error) {
        set({ exporting: { status: 'error', code: errorCodeOf(error) } });
      }
    },

    resetExport: () => {
      if (get().exporting.status !== 'running') set({ exporting: { status: 'idle' } });
    },

    importExport: async (source) => {
      if (get().importing.status === 'running') return false;
      set({ importing: { status: 'running', done: 0, total: 0 } });
      void setKeepScreenOn(true);
      try {
        const library = getLibraryUseCases();
        const reader = await library.openExportReader(source);
        const result = await library.importLibraryExport(reader, ({ done, total }) =>
          set({ importing: { status: 'running', done, total } }),
        );
        set({ importing: { status: 'done', result } });
        return true;
      } catch (error) {
        set({ importing: { status: 'error', code: errorCodeOf(error) } });
        return false;
      } finally {
        void setKeepScreenOn(false);
        await Promise.all([
          useLibraryStore.getState().load(),
          useCollectionsStore.getState().load(),
        ]).catch(() => undefined);
      }
    },

    resetImport: () => {
      if (get().importing.status !== 'running') set({ importing: { status: 'idle' } });
    },
  };
});
