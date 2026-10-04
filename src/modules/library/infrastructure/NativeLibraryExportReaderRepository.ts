import { DeviceFiles, readCacheFile } from '../../../shared/infrastructure/deviceFiles';
import type { DeviceFile } from '../domain/DeviceFile';
import { LibraryError } from '../domain/LibraryError';
import type {
  LibraryExportEntry,
  LibraryExportReaderRepository,
} from '../domain/LibraryExportRepository';

/**
 * Reads an export file on the device entry by entry: the plugin streams through the ZIP and
 * copies one entry at a time to the cache, so a multi-GB library never sits in memory.
 */
export class NativeLibraryExportReaderRepository implements LibraryExportReaderRepository {
  private constructor(private readonly id: string) {}

  static async open(file: DeviceFile): Promise<NativeLibraryExportReaderRepository> {
    const { id } = await DeviceFiles.openBackup({ uri: file.getUri() });
    return new NativeLibraryExportReaderRepository(id);
  }

  async next(): Promise<LibraryExportEntry | null> {
    let entry: { done: boolean; name?: string };
    try {
      entry = await DeviceFiles.nextBackupEntry({ id: this.id });
    } catch {
      throw new LibraryError('invalidExport', '[NativeLibraryExportReaderRepository] Corrupt file');
    }
    if (entry.done || !entry.name) return null;
    return {
      path: entry.name,
      read: async () => {
        const { path } = await DeviceFiles.extractBackupEntry({ id: this.id });
        try {
          return await readCacheFile(path);
        } finally {
          void DeviceFiles.deleteCacheFile({ path });
        }
      },
    };
  }

  async close(): Promise<void> {
    await DeviceFiles.closeBackup({ id: this.id });
  }
}
