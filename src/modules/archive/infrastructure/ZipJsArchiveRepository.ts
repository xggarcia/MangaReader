import { BlobReader, BlobWriter, ZipReader, configure, type FileEntry } from '@zip.js/zip.js';
import { ArchiveError } from '../domain/ArchiveError';
import type { ArchiveFormat } from '../domain/ArchiveFormat';
import { ArchiveSession } from '../domain/ArchiveSession';
import { InThreadArchiveRepository } from './InThreadArchiveRepository';

// This repository already runs inside the archive worker: no nested workers needed.
// Native DecompressionStream handles inflate when available.
configure({ useWebWorkers: false, useCompressionStream: true });

interface ZipSession {
  reader: ZipReader<Blob>;
  entries: Map<string, FileEntry>;
}

/** CBZ reader backed by zip.js. Reads entries lazily from the Blob (random access). */
export class ZipJsArchiveRepository extends InThreadArchiveRepository {
  private readonly sessions = new Map<string, ZipSession>();

  async open(file: Blob, format: ArchiveFormat): Promise<ArchiveSession> {
    if (!format.isZip())
      throw new ArchiveError('unsupported', '[ZipJsArchiveRepository] Not a ZIP archive');

    const reader = new ZipReader(new BlobReader(file));
    let entries: Map<string, FileEntry>;
    try {
      const allEntries = await reader.getEntries();
      entries = new Map(
        allEntries
          .filter((entry): entry is FileEntry => !entry.directory)
          .map((entry) => [entry.filename, entry]),
      );
    } catch (error) {
      await reader.close().catch(() => undefined);
      throw new ArchiveError('corrupt', `[ZipJsArchiveRepository] ${String(error)}`);
    }

    const id = crypto.randomUUID();
    this.sessions.set(id, { reader, entries });
    return ArchiveSession.create({ id, format, entryPaths: [...entries.keys()] });
  }

  async readEntry(sessionId: string, entryPath: string, mimeType: string): Promise<Blob> {
    const entry = this.getSession(sessionId).entries.get(entryPath);
    if (!entry)
      throw new ArchiveError('corrupt', `[ZipJsArchiveRepository] Entry not found: ${entryPath}`);
    if (entry.encrypted) {
      throw new ArchiveError(
        'unsupported',
        `[ZipJsArchiveRepository] Encrypted entry: ${entryPath}`,
      );
    }
    try {
      return await entry.getData(new BlobWriter(mimeType));
    } catch (error) {
      throw new ArchiveError('corrupt', `[ZipJsArchiveRepository] ${String(error)}`);
    }
  }

  async close(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.sessions.delete(sessionId);
    await session.reader.close();
  }

  private getSession(sessionId: string): ZipSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`[ZipJsArchiveRepository] Unknown session: ${sessionId}`);
    return session;
  }
}
