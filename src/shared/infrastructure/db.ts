import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CollectionPrimitive } from '../../modules/library/domain/Collection';
import type { ComicPrimitive } from '../../modules/library/domain/Comic';
import type { ReadingDayPrimitive } from '../../modules/reading/domain/ReadingDay';
import type { ReadingProgressPrimitive } from '../../modules/reading/domain/ReadingProgress';

export const DB_NAME = 'manga-reader';
export const DB_VERSION = 2;

export interface MangaReaderDB extends DBSchema {
  comics: { key: string; value: ComicPrimitive };
  covers: { key: string; value: Blob };
  /** Comic files, only used when OPFS is unavailable. */
  files: { key: string; value: Blob };
  progress: { key: string; value: ReadingProgressPrimitive };
  settings: { key: string; value: unknown };
  collections: { key: string; value: CollectionPrimitive };
  /** One record per calendar day with reading activity (statistics). */
  activity: { key: string; value: ReadingDayPrimitive };
}

export type MangaReaderDatabase = IDBPDatabase<MangaReaderDB>;

/** Opens the app database, applying versioned migrations. */
export function openMangaReaderDb(name: string = DB_NAME): Promise<MangaReaderDatabase> {
  return openDB<MangaReaderDB>(name, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('comics', { keyPath: 'id' });
        db.createObjectStore('covers');
        db.createObjectStore('files');
        db.createObjectStore('progress', { keyPath: 'comicId' });
        db.createObjectStore('settings');
      }
      if (oldVersion < 2) {
        db.createObjectStore('collections', { keyPath: 'id' });
        db.createObjectStore('activity', { keyPath: 'date' });
      }
    },
  });
}

let database: Promise<MangaReaderDatabase> | null = null;

/** Shared connection used by every Idb* repository. */
export function getDb(): Promise<MangaReaderDatabase> {
  database ??= openMangaReaderDb();
  return database;
}
