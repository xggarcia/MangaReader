import type { ArchiveFormatPrimitive } from '../../archive/domain/ArchiveFormat';
import { Comic } from '../../library/domain/Comic';
import {
  ReadingProgress,
  type ReadingProgressPrimitive,
} from '../../reading/domain/ReadingProgress';

export interface SyncEntryPrimitive {
  /** Comic id on the device that sent it. */
  id: string;
  title: string;
  series: string | null;
  number: string | null;
  author: string | null;
  fileName: string;
  /** Size of the imported file: with the name, identifies the same comic on both devices. */
  fileSize: number;
  format: ArchiveFormatPrimitive;
  pageCount: number;
  progress: ReadingProgressPrimitive;
}

/**
 * A comic with reading progress, as shared with a paired device: enough to recognise the same
 * comic there, merge its progress, or show it there as a cover-only record.
 */
export class SyncEntry {
  private constructor(
    private readonly data: Readonly<Omit<SyncEntryPrimitive, 'progress'>>,
    private readonly progress: ReadingProgress,
  ) {}

  static create(props: SyncEntryPrimitive): SyncEntry {
    if (props.id.trim() === '') throw new Error('[SyncEntry] id must not be empty');
    if (props.fileName.trim() === '') throw new Error('[SyncEntry] fileName must not be empty');
    const progress = ReadingProgress.create({ ...props.progress, comicId: props.id });
    const data = {
      id: props.id,
      title: props.title,
      series: props.series,
      number: props.number,
      author: props.author,
      fileName: props.fileName,
      fileSize: props.fileSize,
      format: props.format,
      pageCount: props.pageCount,
    };
    return new SyncEntry(data, progress);
  }

  static fromPrimitive(data: SyncEntryPrimitive): SyncEntry {
    return SyncEntry.create(data);
  }

  static fromLibrary(comic: Comic, progress: ReadingProgress): SyncEntry {
    const primitive = comic.toPrimitive();
    return SyncEntry.create({
      id: primitive.id,
      title: primitive.title,
      series: primitive.series,
      number: primitive.number,
      author: primitive.author,
      fileName: primitive.fileName,
      fileSize: primitive.fileSize,
      format: primitive.format,
      pageCount: primitive.pageCount,
      progress: progress.toPrimitive(),
    });
  }

  getId(): string {
    return this.data.id;
  }

  /** When the progress last changed (reading, or marking as read/unread). */
  getUpdatedAt(): number {
    return this.progress.getUpdatedAt();
  }

  /** The same comic here: same id (moved by a library export) or the same imported file. */
  matches(comic: Comic): boolean {
    return (
      comic.getId() === this.data.id ||
      comic.isSameFileAs({ name: this.data.fileName, size: this.data.fileSize })
    );
  }

  /** This progress for the local copy of the comic (its id, and its page count if different). */
  progressFor(comic: Comic): ReadingProgress {
    const pageCount = comic.getPageCount();
    const primitive = this.progress.toPrimitive();
    return ReadingProgress.create({
      ...primitive,
      comicId: comic.getId(),
      pageCount,
      currentPage: Math.min(primitive.currentPage, pageCount - 1),
    });
  }

  /** A comic read on the other device and not here: its cover and progress, without the file. */
  toCoverOnlyComic(now: number): Comic {
    return Comic.create({
      ...this.data,
      storedSize: 0,
      optimizedQuality: null,
      addedAt: now,
      archivedAt: now,
    });
  }

  toPrimitive(): SyncEntryPrimitive {
    return { ...this.data, progress: this.progress.toPrimitive() };
  }

  equals(other: SyncEntry): boolean {
    return this.data.id === other.data.id;
  }
}
