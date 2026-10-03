import { PageEntry, type PageEntryPrimitive } from './PageEntry';

export type PageListPrimitive = PageEntryPrimitive[];

// Natural ordering: "page2" before "page10", case- and accent-insensitive.
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function compareSegments(a: readonly string[], b: readonly string[]): number {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const isLastA = i === a.length - 1;
    const isLastB = i === b.length - 1;
    // Files at a given level come before sub-folders at that same level.
    if (isLastA !== isLastB) return isLastA ? -1 : 1;
    const result = collator.compare(a[i] ?? '', b[i] ?? '');
    if (result !== 0) return result;
  }
  return a.length - b.length;
}

/** Ordered pages of a comic: image entries only, in natural order. */
export class PageList {
  private constructor(private readonly pages: readonly PageEntry[]) {}

  /** Builds the page list from every entry path in an archive, ignoring non-page files. */
  static fromEntryPaths(entryPaths: readonly string[]): PageList {
    const pages = entryPaths.filter((path) => PageEntry.isPagePath(path)).map(PageEntry.create);
    return PageList.create(pages);
  }

  static create(pages: readonly PageEntry[]): PageList {
    const unique = new Map(pages.map((page) => [page.getPath(), page]));
    const sorted = [...unique.values()].sort((a, b) =>
      compareSegments(a.getSortSegments(), b.getSortSegments()),
    );
    return new PageList(sorted);
  }

  static fromPrimitive(data: PageListPrimitive): PageList {
    return PageList.create(data.map(PageEntry.fromPrimitive));
  }

  count(): number {
    return this.pages.length;
  }

  isEmpty(): boolean {
    return this.pages.length === 0;
  }

  at(index: number): PageEntry {
    const page = this.pages[index];
    if (!page) throw new Error(`[PageList] Page index out of range: ${index}`);
    return page;
  }

  toArray(): PageEntry[] {
    return [...this.pages];
  }

  toPrimitive(): PageListPrimitive {
    return this.pages.map((page) => page.toPrimitive());
  }

  equals(other: PageList): boolean {
    return (
      this.pages.length === other.pages.length &&
      this.pages.every((page, i) => other.pages[i]?.equals(page) === true)
    );
  }
}
