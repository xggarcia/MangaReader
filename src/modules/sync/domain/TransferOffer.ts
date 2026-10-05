import type { CollectionColor } from '../../library/domain/Collection';
import type { Comic } from '../../library/domain/Comic';
import type { ReadingProgressPrimitive } from '../../reading/domain/ReadingProgress';
import type { SyncEntryPrimitive } from './SyncEntry';

/** A comic offered to a paired device: its identity and metadata, and its progress if any. */
export interface OfferedComic extends Omit<SyncEntryPrimitive, 'progress'> {
  progress: ReadingProgressPrimitive | null;
  /** Bytes that will travel (the stored copy, possibly reduced). */
  storedSize: number;
}

/** The collection a set of comics was sent as, recreated (or completed) on the other device. */
export interface OfferedCollection {
  id: string;
  name: string;
  color: CollectionColor;
}

export function offeredComic(
  comic: Comic,
  progress: ReadingProgressPrimitive | null,
): OfferedComic {
  const data = comic.toPrimitive();
  return {
    id: data.id,
    title: data.title,
    series: data.series,
    number: data.number,
    author: data.author,
    fileName: data.fileName,
    fileSize: data.fileSize,
    format: data.format,
    pageCount: data.pageCount,
    storedSize: data.storedSize,
    progress,
  };
}

/** Whether `comic` here is the offered one with its file (not just a cover-only record). */
export function alreadyHas(comic: Comic, offered: OfferedComic): boolean {
  const sameComic =
    comic.getId() === offered.id ||
    comic.isSameFileAs({ name: offered.fileName, size: offered.fileSize });
  return sameComic && !comic.isArchived();
}
