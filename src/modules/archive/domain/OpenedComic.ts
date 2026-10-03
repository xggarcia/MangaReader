import { ArchiveFormat, type ArchiveFormatPrimitive } from './ArchiveFormat';
import { PageList, type PageListPrimitive } from './PageList';

export interface OpenedComicPrimitive {
  sessionId: string;
  format: ArchiveFormatPrimitive;
  pages: PageListPrimitive;
  comicInfoPath: string | null;
}

/** A comic archive ready to be read: its session and its ordered pages (never empty). */
export class OpenedComic {
  private constructor(
    private readonly sessionId: string,
    private readonly format: ArchiveFormat,
    private readonly pages: PageList,
    private readonly comicInfoPath: string | null,
  ) {}

  static create(props: {
    sessionId: string;
    format: ArchiveFormat;
    pages: PageList;
    comicInfoPath?: string | null;
  }): OpenedComic {
    if (props.pages.isEmpty()) throw new Error('[OpenedComic] A comic needs at least one page');
    return new OpenedComic(props.sessionId, props.format, props.pages, props.comicInfoPath ?? null);
  }

  static fromPrimitive(data: OpenedComicPrimitive): OpenedComic {
    return OpenedComic.create({
      sessionId: data.sessionId,
      format: ArchiveFormat.fromPrimitive(data.format),
      pages: PageList.fromPrimitive(data.pages),
      comicInfoPath: data.comicInfoPath,
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

  /** Entry path of ComicInfo.xml, if the archive has one. */
  getComicInfoPath(): string | null {
    return this.comicInfoPath;
  }

  toPrimitive(): OpenedComicPrimitive {
    return {
      sessionId: this.sessionId,
      format: this.format.toPrimitive(),
      pages: this.pages.toPrimitive(),
      comicInfoPath: this.comicInfoPath,
    };
  }

  equals(other: OpenedComic): boolean {
    return this.sessionId === other.sessionId;
  }
}
