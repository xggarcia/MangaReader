export interface ReadingDayPrimitive {
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
  /** Seconds spent reading (app in the foreground, reader open). */
  seconds: number;
  /** Page turns counted forward (re-reading a page counts again). */
  pages: number;
  /** Comics finished that day. */
  finishedComicIds: string[];
  /** Comics opened that day. */
  comicIds: string[];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Formats a timestamp as the local calendar day used for statistics. */
export function toLocalDay(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Reading activity of one calendar day. Immutable; additions return a new day. */
export class ReadingDay {
  private constructor(private readonly data: Readonly<ReadingDayPrimitive>) {}

  static empty(date: string): ReadingDay {
    return ReadingDay.create({ date, seconds: 0, pages: 0, finishedComicIds: [], comicIds: [] });
  }

  static create(props: ReadingDayPrimitive): ReadingDay {
    ReadingDay.ensureIsValid(props);
    return new ReadingDay({
      ...props,
      finishedComicIds: [...new Set(props.finishedComicIds)],
      comicIds: [...new Set(props.comicIds)],
    });
  }

  static fromPrimitive(data: ReadingDayPrimitive): ReadingDay {
    return ReadingDay.create(data);
  }

  static ensureIsValid(props: ReadingDayPrimitive): void {
    if (!DATE_PATTERN.test(props.date)) throw new Error(`[ReadingDay] Invalid date: ${props.date}`);
    if (!Number.isFinite(props.seconds) || props.seconds < 0) {
      throw new Error('[ReadingDay] seconds must be a non-negative number');
    }
    if (!Number.isInteger(props.pages) || props.pages < 0) {
      throw new Error('[ReadingDay] pages must be a non-negative integer');
    }
  }

  /** Adds a slice of reading time and pages for a comic. */
  record(props: {
    comicId: string;
    seconds: number;
    pages: number;
    finished: boolean;
  }): ReadingDay {
    return ReadingDay.create({
      ...this.data,
      seconds: this.data.seconds + Math.max(0, props.seconds),
      pages: this.data.pages + Math.max(0, Math.trunc(props.pages)),
      comicIds: [...this.data.comicIds, props.comicId],
      finishedComicIds: props.finished
        ? [...this.data.finishedComicIds, props.comicId]
        : this.data.finishedComicIds,
    });
  }

  getDate(): string {
    return this.data.date;
  }

  getSeconds(): number {
    return this.data.seconds;
  }

  getPages(): number {
    return this.data.pages;
  }

  getFinishedComicIds(): string[] {
    return [...this.data.finishedComicIds];
  }

  getComicIds(): string[] {
    return [...this.data.comicIds];
  }

  hasActivity(): boolean {
    return this.data.seconds > 0 || this.data.pages > 0;
  }

  toPrimitive(): ReadingDayPrimitive {
    return {
      ...this.data,
      finishedComicIds: [...this.data.finishedComicIds],
      comicIds: [...this.data.comicIds],
    };
  }

  equals(other: ReadingDay): boolean {
    return this.data.date === other.data.date;
  }
}
