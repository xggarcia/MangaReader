import type { ExportedFile } from './DeviceFileRepository';

/** Writes one export file entry by entry (comic files can be hundreds of MB each). */
export interface LibraryExportWriterRepository {
  begin(fileName: string): Promise<void>;
  addEntry(path: string, content: Blob, onBytes?: (bytes: number) => void): Promise<void>;
  finish(): Promise<ExportedFile>;
  /** Discards a partly written file. */
  abort(): Promise<void>;
}

export interface LibraryExportEntry {
  path: string;
  read(): Promise<Blob>;
}

/** Reads an export file entry by entry, in the order it was written. */
export interface LibraryExportReaderRepository {
  /** `null` once every entry has been read. */
  next(): Promise<LibraryExportEntry | null>;
  close(): Promise<void>;
}
