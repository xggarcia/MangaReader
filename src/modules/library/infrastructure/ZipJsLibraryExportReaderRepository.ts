import { BlobReader, BlobWriter, ZipReader, type FileEntry } from '@zip.js/zip.js';
import { LibraryError } from '../domain/LibraryError';
import type {
  LibraryExportEntry,
  LibraryExportReaderRepository,
} from '../domain/LibraryExportRepository';

/** Reads an export file picked in the browser (web version), with random access to the Blob. */
export class ZipJsLibraryExportReaderRepository implements LibraryExportReaderRepository {
  private index = 0;

  private constructor(
    private readonly reader: ZipReader<Blob>,
    private readonly entries: FileEntry[],
  ) {}

  static async open(file: Blob): Promise<ZipJsLibraryExportReaderRepository> {
    const reader = new ZipReader(new BlobReader(file), { useWebWorkers: false });
    try {
      const entries = (await reader.getEntries()).filter(
        (entry): entry is FileEntry => !entry.directory,
      );
      return new ZipJsLibraryExportReaderRepository(reader, entries);
    } catch {
      await reader.close().catch(() => undefined);
      throw new LibraryError('invalidExport', '[ZipJsLibraryExportReaderRepository] Not a ZIP');
    }
  }

  next(): Promise<LibraryExportEntry | null> {
    const entry = this.entries[this.index++];
    if (!entry) return Promise.resolve(null);
    return Promise.resolve({
      path: entry.filename,
      read: () => entry.getData(new BlobWriter()),
    });
  }

  async close(): Promise<void> {
    await this.reader.close();
  }
}
