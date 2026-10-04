import { DeviceFiles, writeBlobToExport } from '../../../shared/infrastructure/deviceFiles';
import type { ExportedFile } from '../domain/DeviceFileRepository';
import { LibraryError } from '../domain/LibraryError';
import type { LibraryExportWriterRepository } from '../domain/LibraryExportRepository';

function rethrow(error: unknown): never {
  if ((error as { code?: string } | null)?.code === 'STORAGE_FULL') {
    throw new LibraryError('quotaExceeded', '[NativeLibraryExportWriterRepository] Storage full');
  }
  throw error;
}

/**
 * Streams the export to a ZIP file in the app cache, written by the DeviceFiles plugin. The
 * file is then shared or copied to the comics folder.
 */
export class NativeLibraryExportWriterRepository implements LibraryExportWriterRepository {
  private id: string | null = null;
  private fileName = '';

  async begin(fileName: string): Promise<void> {
    this.fileName = fileName;
    this.id = (await DeviceFiles.createExport({ fileName })).id;
  }

  async addEntry(path: string, content: Blob, onBytes?: (bytes: number) => void): Promise<void> {
    const id = this.requireId();
    try {
      await DeviceFiles.addExportEntry({ id, name: path });
      await writeBlobToExport(id, content, onBytes);
    } catch (error) {
      rethrow(error);
    }
  }

  async finish(): Promise<ExportedFile> {
    try {
      const { path, size } = await DeviceFiles.finishExport({ id: this.requireId() });
      this.id = null;
      return { path, size, fileName: this.fileName };
    } catch (error) {
      rethrow(error);
    }
  }

  async abort(): Promise<void> {
    if (!this.id) return;
    const id = this.id;
    this.id = null;
    await DeviceFiles.abortExport({ id });
  }

  private requireId(): string {
    if (!this.id) throw new Error('[NativeLibraryExportWriterRepository] Export not started');
    return this.id;
  }
}
