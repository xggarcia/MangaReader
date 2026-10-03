import { PageWindow } from '../modules/reading/domain/PageWindow';

export interface PageUrlSnapshot {
  urls: ReadonlyMap<number, string>;
  failed: ReadonlySet<number>;
}

export const EMPTY_PAGE_URL_SNAPSHOT: PageUrlSnapshot = { urls: new Map(), failed: new Set() };

/**
 * Keeps object URLs only for the pages inside the current PageWindow: pages entering the window
 * are extracted and decoded ahead of time, pages leaving it are revoked. External store for
 * `useSyncExternalStore`.
 */
export class PageUrlCache {
  private readonly urls = new Map<number, string>();
  // Decoded images kept alive while their page is in the window, so turning the page is instant.
  private readonly decoded = new Map<number, HTMLImageElement>();
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

  setCurrentPage(index: number, range: { behind?: number; ahead?: number } = {}): void {
    this.window = PageWindow.create({ current: index, total: this.totalPages, ...range });
    let changed = false;
    for (const pageIndex of [...this.urls.keys()]) {
      if (!this.window.contains(pageIndex)) {
        this.releasePage(pageIndex);
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
    for (const pageIndex of [...this.urls.keys()]) this.releasePage(pageIndex);
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
        const url = URL.createObjectURL(blob);
        this.urls.set(pageIndex, url);
        void this.decode(pageIndex, url, generation);
      },
      () => {
        if (generation !== this.generation) return;
        this.pending.delete(pageIndex);
        this.failed.add(pageIndex);
        this.emit();
      },
    );
  }

  /** Decodes the image off the critical path, then publishes it (even if decoding fails). */
  private async decode(pageIndex: number, url: string, generation: number): Promise<void> {
    if (typeof Image !== 'undefined') {
      const image = new Image();
      image.src = url;
      this.decoded.set(pageIndex, image);
      await image.decode().catch(() => undefined);
    }
    if (generation === this.generation && this.urls.get(pageIndex) === url) this.emit();
  }

  private releasePage(pageIndex: number): void {
    const url = this.urls.get(pageIndex);
    if (url) URL.revokeObjectURL(url);
    this.urls.delete(pageIndex);
    const image = this.decoded.get(pageIndex);
    if (image) image.src = '';
    this.decoded.delete(pageIndex);
  }

  private emit(): void {
    this.snapshot = { urls: new Map(this.urls), failed: new Set(this.failed) };
    for (const listener of this.listeners) listener();
  }
}
