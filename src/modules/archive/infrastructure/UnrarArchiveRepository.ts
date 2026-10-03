import { createExtractorFromData, UnrarError, type Extractor } from 'node-unrar-js';
import unrarWasmUrl from 'node-unrar-js/esm/js/unrar.wasm?url';
import { ArchiveError, type ArchiveErrorCode } from '../domain/ArchiveError';
import type { ArchiveFormat } from '../domain/ArchiveFormat';
import { ArchiveSession } from '../domain/ArchiveSession';
import { InThreadArchiveRepository } from './InThreadArchiveRepository';

interface RarSession {
  extractor: Extractor<Uint8Array>;
  entryPaths: Set<string>;
  /**
   * Solid archives compress files as one stream: extracting a page means decompressing every
   * page before it. Their entries are extracted once on open and kept here instead.
   */
  extracted: Map<string, Uint8Array> | null;
}

let wasmBinary: Promise<ArrayBuffer> | null = null;

function loadWasm(): Promise<ArrayBuffer> {
  wasmBinary ??= fetch(unrarWasmUrl).then((response) => {
    if (!response.ok) throw new Error(`[UnrarArchiveRepository] Cannot load unrar.wasm`);
    return response.arrayBuffer();
  });
  return wasmBinary;
}

function toArchiveError(error: unknown): ArchiveError {
  if (error instanceof ArchiveError) return error;
  let code: ArchiveErrorCode = 'corrupt';
  if (error instanceof UnrarError) {
    if (error.reason === 'ERAR_MISSING_PASSWORD' || error.reason === 'ERAR_BAD_PASSWORD') {
      code = 'unsupported';
    } else if (error.reason === 'ERAR_UNKNOWN_FORMAT') {
      code = 'unsupported';
    }
  }
  return new ArchiveError(code, `[UnrarArchiveRepository] ${String(error)}`);
}

function copyOf(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  // Extractions may be views over WASM memory: copy before keeping or wrapping them in a Blob.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

/**
 * CBR reader backed by the official UnRAR code compiled to WASM (RAR4 and RAR5). The archive is
 * loaded in memory while open; pages are extracted on demand unless the archive is solid.
 */
export class UnrarArchiveRepository extends InThreadArchiveRepository {
  private readonly sessions = new Map<string, RarSession>();

  async open(file: Blob, format: ArchiveFormat): Promise<ArchiveSession> {
    if (!format.isRar()) {
      throw new ArchiveError('unsupported', '[UnrarArchiveRepository] Not a RAR archive');
    }
    try {
      const extractor = await createExtractorFromData({
        wasmBinary: await loadWasm(),
        data: await file.arrayBuffer(),
      });
      const { arcHeader, fileHeaders } = extractor.getFileList();
      const headers = [...fileHeaders].filter((header) => !header.flags.directory);
      if (arcHeader.flags.headerEncrypted || headers.some((header) => header.flags.encrypted)) {
        throw new ArchiveError('unsupported', '[UnrarArchiveRepository] Encrypted archive');
      }

      const entryPaths = new Set(headers.map((header) => header.name));
      let extracted: Map<string, Uint8Array> | null = null;
      if (arcHeader.flags.solid) {
        extracted = new Map();
        for (const { fileHeader, extraction } of extractor.extract().files) {
          if (extraction) extracted.set(fileHeader.name, copyOf(extraction));
        }
      }

      const id = crypto.randomUUID();
      this.sessions.set(id, { extractor, entryPaths, extracted });
      return ArchiveSession.create({ id, format, entryPaths: [...entryPaths] });
    } catch (error) {
      throw toArchiveError(error);
    }
  }

  async readEntry(sessionId: string, entryPath: string, mimeType: string): Promise<Blob> {
    const session = this.getSession(sessionId);
    if (!session.entryPaths.has(entryPath)) {
      throw new ArchiveError('corrupt', `[UnrarArchiveRepository] Entry not found: ${entryPath}`);
    }
    const cached = session.extracted?.get(entryPath);
    if (cached) return new Blob([cached as Uint8Array<ArrayBuffer>], { type: mimeType });

    try {
      const [file] = [...session.extractor.extract({ files: [entryPath] }).files];
      if (!file?.extraction) {
        throw new ArchiveError('corrupt', `[UnrarArchiveRepository] Empty entry: ${entryPath}`);
      }
      return new Blob([copyOf(file.extraction)], { type: mimeType });
    } catch (error) {
      throw toArchiveError(error);
    }
  }

  async close(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  private getSession(sessionId: string): RarSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`[UnrarArchiveRepository] Unknown session: ${sessionId}`);
    return session;
  }
}
