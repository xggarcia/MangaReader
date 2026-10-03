export interface ReadingProgressPrimitive {
  comicId: string;
  /** 0-based index of the last page shown. */
  currentPage: number;
  pageCount: number;
  /** Epoch milliseconds. */
  lastReadAt: number;
  isRead: boolean;
}

/** Where the reader is in a comic. Reaching the last page marks the comic as read. */
export class ReadingProgress {
  private constructor(
    private readonly comicId: string,
    private readonly currentPage: number,
    private readonly pageCount: number,
    private readonly lastReadAt: number,
    private readonly read: boolean,
  ) {}

  static create(props: ReadingProgressPrimitive): ReadingProgress {
    ReadingProgress.ensureIsValid(props);
    return new ReadingProgress(
      props.comicId,
      props.currentPage,
      props.pageCount,
      props.lastReadAt,
      props.isRead,
    );
  }

  /** Progress for a comic opened for the first time at `page`. */
  static start(props: {
    comicId: string;
    page: number;
    pageCount: number;
    now: number;
  }): ReadingProgress {
    return ReadingProgress.create({
      comicId: props.comicId,
      currentPage: props.page,
      pageCount: props.pageCount,
      lastReadAt: props.now,
      isRead: props.page === props.pageCount - 1,
    });
  }

  static fromPrimitive(data: ReadingProgressPrimitive): ReadingProgress {
    return ReadingProgress.create(data);
  }

  static ensureIsValid(props: ReadingProgressPrimitive): void {
    if (props.comicId.trim() === '') throw new Error('[ReadingProgress] comicId must not be empty');
    if (!Number.isInteger(props.pageCount) || props.pageCount < 1) {
      throw new Error('[ReadingProgress] pageCount must be a positive integer');
    }
    if (
      !Number.isInteger(props.currentPage) ||
      props.currentPage < 0 ||
      props.currentPage >= props.pageCount
    ) {
      throw new Error('[ReadingProgress] currentPage is out of range');
    }
    if (!Number.isFinite(props.lastReadAt) || props.lastReadAt < 0) {
      throw new Error('[ReadingProgress] lastReadAt must be a valid timestamp');
    }
  }

  /** Moves to `page`. Reaching the last page marks the comic as read; going back keeps it read. */
  withPage(page: number, now: number): ReadingProgress {
    return ReadingProgress.create({
      ...this.toPrimitive(),
      currentPage: page,
      lastReadAt: now,
      isRead: this.read || page === this.pageCount - 1,
    });
  }

  markAsRead(): ReadingProgress {
    return ReadingProgress.create({ ...this.toPrimitive(), isRead: true });
  }

  /** Marks as unread and starts again from the first page. */
  markAsUnread(): ReadingProgress {
    return ReadingProgress.create({ ...this.toPrimitive(), isRead: false, currentPage: 0 });
  }

  getComicId(): string {
    return this.comicId;
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageCount(): number {
    return this.pageCount;
  }

  getLastReadAt(): number {
    return this.lastReadAt;
  }

  isRead(): boolean {
    return this.read;
  }

  /** Fraction read, from 0 to 1. A read comic is always complete. */
  getRatio(): number {
    if (this.read) return 1;
    return (this.currentPage + 1) / this.pageCount;
  }

  toPrimitive(): ReadingProgressPrimitive {
    return {
      comicId: this.comicId,
      currentPage: this.currentPage,
      pageCount: this.pageCount,
      lastReadAt: this.lastReadAt,
      isRead: this.read,
    };
  }

  equals(other: ReadingProgress): boolean {
    return this.comicId === other.comicId;
  }
}
