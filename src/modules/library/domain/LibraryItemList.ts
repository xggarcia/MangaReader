import { LibraryItem, type LibraryItemPrimitive } from './LibraryItem';

export const LIBRARY_SORT_ORDERS = ['title', 'recentlyAdded', 'lastRead'] as const;
export type LibrarySortOrder = (typeof LIBRARY_SORT_ORDERS)[number];

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function searchableText(item: LibraryItem): string {
  const comic = item.getComic();
  return normalizeForSearch(
    [comic.getTitle(), comic.getSeries(), comic.getAuthor(), comic.getFileName()]
      .filter(Boolean)
      .join(' '),
  );
}

/** Sort key for titles: series and number first, so volumes of a series stay together. */
function titleKey(item: LibraryItem): string {
  const comic = item.getComic();
  const series = comic.getSeries();
  return series ? `${series} ${comic.getNumber() ?? ''} ${comic.getTitle()}` : comic.getTitle();
}

const comparators: Record<LibrarySortOrder, (a: LibraryItem, b: LibraryItem) => number> = {
  title: (a, b) => collator.compare(titleKey(a), titleKey(b)),
  recentlyAdded: (a, b) => b.getComic().getAddedAt() - a.getComic().getAddedAt(),
  // Never-read comics go last, newest additions first among them.
  lastRead: (a, b) => {
    const lastA = a.getLastReadAt();
    const lastB = b.getLastReadAt();
    if (lastA === null && lastB === null) return comparators.recentlyAdded(a, b);
    if (lastA === null) return 1;
    if (lastB === null) return -1;
    return lastB - lastA;
  },
};

/** The library contents with search and ordering rules. Immutable. */
export class LibraryItemList {
  private constructor(private readonly items: readonly LibraryItem[]) {}

  static create(items: readonly LibraryItem[]): LibraryItemList {
    return new LibraryItemList([...items]);
  }

  static empty(): LibraryItemList {
    return new LibraryItemList([]);
  }

  static fromPrimitive(data: LibraryItemPrimitive[]): LibraryItemList {
    return LibraryItemList.create(data.map(LibraryItem.fromPrimitive));
  }

  static isSortOrder(value: unknown): value is LibrarySortOrder {
    return typeof value === 'string' && (LIBRARY_SORT_ORDERS as readonly string[]).includes(value);
  }

  /** Items whose title, series, author or file name contain every word of the query. */
  search(query: string): LibraryItemList {
    const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
    if (words.length === 0) return this;
    return new LibraryItemList(
      this.items.filter((item) => {
        const text = searchableText(item);
        return words.every((word) => text.includes(word));
      }),
    );
  }

  sortBy(order: LibrarySortOrder): LibraryItemList {
    return new LibraryItemList([...this.items].sort(comparators[order]));
  }

  add(item: LibraryItem): LibraryItemList {
    return new LibraryItemList([...this.items.filter((existing) => !existing.equals(item)), item]);
  }

  remove(comicId: string): LibraryItemList {
    return new LibraryItemList(this.items.filter((item) => item.getComic().getId() !== comicId));
  }

  update(item: LibraryItem): LibraryItemList {
    return new LibraryItemList(
      this.items.map((existing) => (existing.equals(item) ? item : existing)),
    );
  }

  /** The comic to resume: the most recently read one that is started but not finished. */
  continueReading(): LibraryItem | null {
    let best: LibraryItem | null = null;
    for (const item of this.items) {
      const lastReadAt = item.getLastReadAt();
      if (lastReadAt === null || item.isRead()) continue;
      if (!best || lastReadAt > (best.getLastReadAt() ?? 0)) best = item;
    }
    return best;
  }

  findById(comicId: string): LibraryItem | null {
    return this.items.find((item) => item.getComic().getId() === comicId) ?? null;
  }

  count(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  toArray(): LibraryItem[] {
    return [...this.items];
  }

  toPrimitive(): LibraryItemPrimitive[] {
    return this.items.map((item) => item.toPrimitive());
  }

  equals(other: LibraryItemList): boolean {
    return (
      this.items.length === other.items.length &&
      this.items.every((item, i) => other.items[i]?.equals(item) === true)
    );
  }
}
