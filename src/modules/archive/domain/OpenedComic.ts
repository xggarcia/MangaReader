import { ArchiveFormat, type ArchiveFormatPrimitive } from './ArchiveFormat';
import { PageList, type PageListPrimitive } from './PageList';

export interface OpenedComicPrimitive {
  sessionId: string;
  format: ArchiveFormatPrimitive;
  pages: PageListPrimitive;
}

/** A comic archive ready to be read: its session and its ordered pages (never empty). */
export class OpenedComic {
  private constructor(
    private readonly sessionId: string,
    private readonly format: ArchiveFormat,
    private readonly pages: PageList,
  ) {}

  static create(props: { sessionId: string; format: ArchiveFormat; pages: PageList }): OpenedComic {
    if (props.pages.isEmpty()) throw new Error('[OpenedComic] A comic needs at least one page');
    return new OpenedComic(props.sessionId, props.format, props.pages);
  }

  static fromPrimitive(data: OpenedComicPrimitive): OpenedComic {
    return OpenedComic.create({
      sessionId: data.sessionId,
      format: ArchiveFormat.fromPrimitive(data.format),
      pages: PageList.fromPrimitive(data.pages),
    });
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getFormat(): ArchiveFormat {
    return this.format;
  }

  getPages(): PageList {
    return this.pages;
  }

  toPrimitive(): OpenedComicPrimitive {
    return {
      sessionId: this.sessionId,
      format: this.format.toPrimitive(),
      pages: this.pages.toPrimitive(),
    };
  }

  equals(other: OpenedComic): boolean {
    return this.sessionId === other.sessionId;
  }
}
