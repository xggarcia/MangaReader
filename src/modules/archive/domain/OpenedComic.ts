import { PageList, type PageListPrimitive } from './PageList';

export interface OpenedComicPrimitive {
  sessionId: string;
  pages: PageListPrimitive;
}

/** A comic archive ready to be read: its session and its ordered pages (never empty). */
export class OpenedComic {
  private constructor(
    private readonly sessionId: string,
    private readonly pages: PageList,
  ) {}

  static create(props: { sessionId: string; pages: PageList }): OpenedComic {
    if (props.pages.isEmpty()) throw new Error('[OpenedComic] A comic needs at least one page');
    return new OpenedComic(props.sessionId, props.pages);
  }

  static fromPrimitive(data: OpenedComicPrimitive): OpenedComic {
    return OpenedComic.create({
      sessionId: data.sessionId,
      pages: PageList.fromPrimitive(data.pages),
    });
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getPages(): PageList {
    return this.pages;
  }

  toPrimitive(): OpenedComicPrimitive {
    return { sessionId: this.sessionId, pages: this.pages.toPrimitive() };
  }

  equals(other: OpenedComic): boolean {
    return this.sessionId === other.sessionId;
  }
}
