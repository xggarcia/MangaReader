import { PageWindow } from '../modules/reading/domain/PageWindow';

export interface PageUrlSnapshot {
  urls: ReadonlyMap<number, string>;
  failed: ReadonlySet<number>;
}

export const EMPTY_PAGE_URL_SNAPSHOT: PageUrlSnapshot = { urls: new Map(), failed: new Set() };

/**
 * Keeps object URLs only for the pages inside the current PageWindow: pages entering the window
 * are extracted, pages leaving it are revoked. External store for `useSyncExternalStore`.
 */
export class PageUrlCache {
  private readonly urls = new Map<number, string>();
  private readonly pending = new Set<number>();
  private readonly failed = new Set<number>();
  private readonly listeners = new Set<() => void>();
  private window: PageWindow | null = null;
  // Bumped on release so late responses from a previous generation are discarded.
  private generation = 0;
  private snapshot: PageUrlSnapshot = EMPTY_PAGE_URL_SNAPSHOT;

  constructor(
    private readonly loadPage: (index: number) => Promise<Blob>,
    private readonly totalPages: number,
  ) {}

  setCurrentPage(index: number): void {
    this.window = PageWindow.create({ current: index, total: this.totalPages });
    let changed = false;
    for (const [pageIndex, url] of this.urls) {
      if (!this.window.contains(pageIndex)) {
        URL.revokeObjectURL(url);
        this.urls.delete(pageIndex);
        changed = true;
      }
    }
    for (const pageIndex of this.window.indicesByPriority()) {
      if (
        !this.urls.has(pageIndex) &&
        !this.pending.has(pageIndex) &&
        !this.failed.has(pageIndex)
      ) {
        this.request(pageIndex);
      }
    }
    if (changed) this.emit();
  }

  /** Revokes every URL. The cache can be reused afterwards by calling `setCurrentPage`. */
  release(): void {
    this.generation++;
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
    this.pending.clear();
    this.failed.clear();
    this.window = null;
    this.emit();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): PageUrlSnapshot => this.snapshot;

  private request(pageIndex: number): void {
    const generation = this.generation;
    this.pending.add(pageIndex);
    this.loadPage(pageIndex).then(
      (blob) => {
        if (generation !== this.generation) return;
        this.pending.delete(pageIndex);
        if (!this.window?.contains(pageIndex)) return;
        this.urls.set(pageIndex, URL.createObjectURL(blob));
        this.emit();
      },
      () => {
        if (generation !== this.generation) return;
        this.pending.delete(pageIndex);
        this.failed.add(pageIndex);
        this.emit();
      },
    );
  }

  private emit(): void {
    this.snapshot = { urls: new Map(this.urls), failed: new Set(this.failed) };
    for (const listener of this.listeners) listener();
  }
}
