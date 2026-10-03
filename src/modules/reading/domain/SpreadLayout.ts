export interface SpreadLayoutPrimitive {
  pageCount: number;
  /** Page indices shown together, in reading order. */
  spreads: number[][];
}

/**
 * Groups pages into what is shown at once. In two-page mode the cover and wide (landscape)
 * pages are shown alone, and the rest are paired in reading order.
 */
export class SpreadLayout {
  private readonly spreadOfPage: number[];

  private constructor(
    private readonly pageCount: number,
    private readonly spreads: readonly (readonly number[])[],
  ) {
    this.spreadOfPage = [];
    spreads.forEach((spread, spreadIndex) => {
      for (const page of spread) this.spreadOfPage[page] = spreadIndex;
    });
  }

  /** One page per spread. */
  static single(pageCount: number): SpreadLayout {
    SpreadLayout.ensurePageCount(pageCount);
    return new SpreadLayout(
      pageCount,
      Array.from({ length: pageCount }, (_, page) => [page]),
    );
  }

  /** Two-page spreads; pages in `widePages` (and the cover) are shown alone. */
  static double(pageCount: number, widePages: ReadonlySet<number> = new Set()): SpreadLayout {
    SpreadLayout.ensurePageCount(pageCount);
    const spreads: number[][] = [];
    let page = 0;
    while (page < pageCount) {
      const isAlone = page === 0 || widePages.has(page);
      const next = page + 1;
      if (!isAlone && next < pageCount && !widePages.has(next)) {
        spreads.push([page, next]);
        page += 2;
      } else {
        spreads.push([page]);
        page += 1;
      }
    }
    return new SpreadLayout(pageCount, spreads);
  }

  static fromPrimitive(data: SpreadLayoutPrimitive): SpreadLayout {
    SpreadLayout.ensurePageCount(data.pageCount);
    return new SpreadLayout(
      data.pageCount,
      data.spreads.map((spread) => [...spread]),
    );
  }

  private static ensurePageCount(pageCount: number): void {
    if (!Number.isInteger(pageCount) || pageCount < 1) {
      throw new Error('[SpreadLayout] pageCount must be a positive integer');
    }
  }

  count(): number {
    return this.spreads.length;
  }

  /** Pages shown together with `page`, in reading order. */
  spreadContaining(page: number): number[] {
    return [...(this.spreads[this.spreadIndexOf(page)] ?? [])];
  }

  /** First page of the spread `step` spreads away from the one containing `page`. */
  pageAfterStep(page: number, step: number): number {
    const target = Math.min(Math.max(this.spreadIndexOf(page) + step, 0), this.spreads.length - 1);
    return this.spreads[target]?.[0] ?? 0;
  }

  isFirstSpread(page: number): boolean {
    return this.spreadIndexOf(page) === 0;
  }

  isLastSpread(page: number): boolean {
    return this.spreadIndexOf(page) === this.spreads.length - 1;
  }

  toPrimitive(): SpreadLayoutPrimitive {
    return { pageCount: this.pageCount, spreads: this.spreads.map((spread) => [...spread]) };
  }

  equals(other: SpreadLayout): boolean {
    return JSON.stringify(this.spreads) === JSON.stringify(other.spreads);
  }

  private spreadIndexOf(page: number): number {
    const clamped = Math.min(Math.max(Math.trunc(page), 0), this.pageCount - 1);
    return this.spreadOfPage[clamped] ?? 0;
  }
}
