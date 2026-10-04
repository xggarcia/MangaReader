import type { ArchiveFormatPrimitive } from '../../archive/domain/ArchiveFormat';
import { PageQuality, type PageQualityPrimitive } from '../../archive/domain/PageQuality';

export interface ComicPrimitive {
  id: string;
  title: string;
  series: string | null;
  number: string | null;
  author: string | null;
  fileName: string;
  /** Size of the imported file (identifies it when the same file is picked again). */
  fileSize: number;
  /** Bytes the private copy takes now; smaller than `fileSize` once optimized. */
  storedSize: number;
  /** Quality the pages were optimized to, or `null` when the copy is the original file. */
  optimizedQuality: PageQualityPrimitive | null;
  format: ArchiveFormatPrimitive;
  pageCount: number;
  /** Epoch milliseconds. */
  addedAt: number;
}

/** Comics saved before optimization existed lack its fields. */
export type StoredComicPrimitive = Omit<ComicPrimitive, 'storedSize' | 'optimizedQuality'> &
  Partial<Pick<ComicPrimitive, 'storedSize' | 'optimizedQuality'>>;

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

  static fromPrimitive(data: StoredComicPrimitive): Comic {
    return Comic.create({
      ...data,
      storedSize: data.storedSize ?? data.fileSize,
      optimizedQuality: data.optimizedQuality ?? null,
    });
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
    if (!Number.isFinite(props.storedSize) || props.storedSize < 0) {
      throw new Error('[Comic] storedSize must be a non-negative number');
    }
    if (props.optimizedQuality !== null) PageQuality.fromPrimitive(props.optimizedQuality);
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

  getStoredSize(): number {
    return this.data.storedSize;
  }

  getOptimizedQuality(): PageQuality | null {
    return this.data.optimizedQuality
      ? PageQuality.fromPrimitive(this.data.optimizedQuality)
      : null;
  }

  /** Whether its pages are already stored at this quality, so optimizing again saves nothing. */
  isOptimizedAs(quality: PageQuality): boolean {
    return this.data.optimizedQuality === quality.toPrimitive();
  }

  getPageCount(): number {
    return this.data.pageCount;
  }

  getAddedAt(): number {
    return this.data.addedAt;
  }

  /** Corrected metadata (edited by the user); blank series or number clear them. */
  withInfo(info: { title: string; series: string | null; number: string | null }): Comic {
    return Comic.create({ ...this.data, ...info });
  }

  /** Moved into another series; the title and volume number are kept. */
  withSeries(series: string): Comic {
    return Comic.create({ ...this.data, series });
  }

  /**
   * The private copy was optimized: `storedSize` is the new size, or the current one when
   * the result was not worth keeping (so the comic is not optimized again at this quality).
   */
  withOptimizedCopy(props: {
    quality: PageQuality;
    storedSize: number;
    format: ArchiveFormatPrimitive;
  }): Comic {
    return Comic.create({
      ...this.data,
      storedSize: props.storedSize,
      format: props.format,
      optimizedQuality: props.quality.toPrimitive(),
    });
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
