import type { ArchiveFormatPrimitive } from '../../archive/domain/ArchiveFormat';

export interface ComicPrimitive {
  id: string;
  title: string;
  series: string | null;
  number: string | null;
  author: string | null;
  fileName: string;
  fileSize: number;
  format: ArchiveFormatPrimitive;
  pageCount: number;
  /** Epoch milliseconds. */
  addedAt: number;
}

const ARCHIVE_EXTENSION = /\.(cbz|cbr|zip|rar)$/i;

/** A comic stored in the library. Metadata comes from ComicInfo.xml or the file name. */
export class Comic {
  private constructor(private readonly data: Readonly<ComicPrimitive>) {}

  static create(props: ComicPrimitive): Comic {
    Comic.ensureIsValid(props);
    return new Comic({
      ...props,
      title: props.title.trim(),
      series: props.series?.trim() || null,
      number: props.number?.trim() || null,
      author: props.author?.trim() || null,
    });
  }

  static fromPrimitive(data: ComicPrimitive): Comic {
    return Comic.create(data);
  }

  static ensureIsValid(props: ComicPrimitive): void {
    if (props.id.trim() === '') throw new Error('[Comic] id must not be empty');
    if (props.title.trim() === '') throw new Error('[Comic] title must not be empty');
    if (props.fileName.trim() === '') throw new Error('[Comic] fileName must not be empty');
    if (!Number.isInteger(props.pageCount) || props.pageCount < 1) {
      throw new Error('[Comic] pageCount must be a positive integer');
    }
    if (!Number.isFinite(props.fileSize) || props.fileSize < 0) {
      throw new Error('[Comic] fileSize must be a non-negative number');
    }
  }

  /** Title derived from a file name: extension removed, underscores turned into spaces. */
  static titleFromFileName(fileName: string): string {
    const title = fileName.replace(ARCHIVE_EXTENSION, '').replace(/_/g, ' ').trim();
    return title === '' ? fileName : title;
  }

  getId(): string {
    return this.data.id;
  }

  getTitle(): string {
    return this.data.title;
  }

  getSeries(): string | null {
    return this.data.series;
  }

  getNumber(): string | null {
    return this.data.number;
  }

  getAuthor(): string | null {
    return this.data.author;
  }

  getFileName(): string {
    return this.data.fileName;
  }

  getFileSize(): number {
    return this.data.fileSize;
  }

  getPageCount(): number {
    return this.data.pageCount;
  }

  getAddedAt(): number {
    return this.data.addedAt;
  }

  /** Whether a picked file is very likely this same comic (same name and size). */
  isSameFileAs(file: { name: string; size: number }): boolean {
    return this.data.fileName === file.name && this.data.fileSize === file.size;
  }

  toPrimitive(): ComicPrimitive {
    return { ...this.data };
  }

  equals(other: Comic): boolean {
    return this.data.id === other.data.id;
  }
}
