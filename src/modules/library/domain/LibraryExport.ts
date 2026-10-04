import {
  ReadingProgress,
  type ReadingProgressPrimitive,
} from '../../reading/domain/ReadingProgress';
import { Collection, type CollectionPrimitive } from './Collection';
import { Comic, type StoredComicPrimitive } from './Comic';
import { LibraryError } from './LibraryError';

export const LIBRARY_EXPORT_FORMAT = 'mangareader-library';
export const LIBRARY_EXPORT_VERSION = 1;
export const LIBRARY_EXPORT_EXTENSION = 'mangareader';

/** Entry layout of an export file: the manifest first, then each cover and comic file. */
export const LIBRARY_EXPORT_PATHS = {
  manifest: 'mangareader.json',
  comic: (comicId: string) => `comics/${comicId}`,
  cover: (comicId: string) => `covers/${comicId}`,
};

export interface LibraryExportPrimitive {
  format: typeof LIBRARY_EXPORT_FORMAT;
  version: number;
  /** Epoch milliseconds. */
  exportedAt: number;
  comics: StoredComicPrimitive[];
  progress: ReadingProgressPrimitive[];
  collections: CollectionPrimitive[];
}

export type LibraryExportEntryPath =
  { kind: 'manifest' } | { kind: 'comic' | 'cover'; comicId: string };

/**
 * Manifest of a library moved to another device: metadata, reading progress and collections
 * of the exported comics. Their files travel in the same export file.
 */
export class LibraryExport {
  private constructor(
    private readonly exportedAt: number,
    private readonly comics: readonly Comic[],
    private readonly progress: readonly ReadingProgress[],
    private readonly collections: readonly Collection[],
  ) {}

  /**
   * Keeps only what belongs to the exported comics: their progress, and collections reduced to
   * them (collections left empty are dropped).
   */
  static create(props: {
    exportedAt: number;
    comics: readonly Comic[];
    progress: readonly ReadingProgress[];
    collections: readonly Collection[];
  }): LibraryExport {
    const ids = new Set(props.comics.map((comic) => comic.getId()));
    const collections = props.collections.flatMap((collection) => {
      const comicIds = collection.getComicIds().filter((id) => ids.has(id));
      return comicIds.length > 0
        ? [Collection.create({ ...collection.toPrimitive(), comicIds })]
        : [];
    });
    return new LibraryExport(
      props.exportedAt,
      [...props.comics],
      props.progress.filter((progress) => ids.has(progress.getComicId())),
      collections,
    );
  }

  static fromPrimitive(data: LibraryExportPrimitive): LibraryExport {
    if (data.format !== LIBRARY_EXPORT_FORMAT || !Array.isArray(data.comics)) {
      throw new LibraryError('invalidExport', '[LibraryExport] Not a MangaReader library');
    }
    if (data.version > LIBRARY_EXPORT_VERSION) {
      throw new LibraryError('invalidExport', '[LibraryExport] Made by a newer version');
    }
    return LibraryExport.create({
      exportedAt: data.exportedAt,
      comics: data.comics.map((comic) => Comic.fromPrimitive(comic)),
      progress: (data.progress ?? []).map((progress) => ReadingProgress.fromPrimitive(progress)),
      collections: (data.collections ?? []).map((collection) =>
        Collection.fromPrimitive(collection),
      ),
    });
  }

  static fromJson(json: string): LibraryExport {
    let data: LibraryExportPrimitive;
    try {
      data = JSON.parse(json) as LibraryExportPrimitive;
    } catch {
      throw new LibraryError('invalidExport', '[LibraryExport] Unreadable manifest');
    }
    return LibraryExport.fromPrimitive(data);
  }

  static parseEntryPath(path: string): LibraryExportEntryPath | null {
    if (path === LIBRARY_EXPORT_PATHS.manifest) return { kind: 'manifest' };
    const match = /^(comics|covers)\/([^/]+)$/.exec(path);
    if (!match?.[2]) return null;
    return { kind: match[1] === 'comics' ? 'comic' : 'cover', comicId: match[2] };
  }

  /** File name for an export made at `time` ("MangaReader 2026-10-04.mangareader"). */
  static fileName(time: number, label = 'MangaReader'): string {
    const date = new Date(time).toISOString().slice(0, 10);
    const safeLabel = label.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'MangaReader';
    return `${safeLabel} ${date}.${LIBRARY_EXPORT_EXTENSION}`;
  }

  getComics(): Comic[] {
    return [...this.comics];
  }

  getProgressFor(comicId: string): ReadingProgress | null {
    return this.progress.find((progress) => progress.getComicId() === comicId) ?? null;
  }

  getCollections(): Collection[] {
    return [...this.collections];
  }

  /** Bytes of the comic files, i.e. roughly the size of the export file. */
  getTotalSize(): number {
    return this.comics.reduce((total, comic) => total + comic.getStoredSize(), 0);
  }

  toPrimitive(): LibraryExportPrimitive {
    return {
      format: LIBRARY_EXPORT_FORMAT,
      version: LIBRARY_EXPORT_VERSION,
      exportedAt: this.exportedAt,
      comics: this.comics.map((comic) => comic.toPrimitive()),
      progress: this.progress.map((progress) => progress.toPrimitive()),
      collections: this.collections.map((collection) => collection.toPrimitive()),
    };
  }

  toJson(): string {
    return JSON.stringify(this.toPrimitive());
  }

  equals(other: LibraryExport): boolean {
    return this.toJson() === other.toJson();
  }
}
