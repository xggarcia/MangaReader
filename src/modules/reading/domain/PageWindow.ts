export interface PageWindowPrimitive {
  current: number;
  total: number;
  behind: number;
  ahead: number;
}

export const DEFAULT_PAGES_BEHIND = 2;
export const DEFAULT_PAGES_AHEAD = 4;

/**
 * Range of pages kept in memory around the current one. Pages outside the window are released,
 * so memory stays bounded no matter how many pages a comic has.
 */
export class PageWindow {
  private constructor(
    private readonly current: number,
    private readonly total: number,
    private readonly behind: number,
    private readonly ahead: number,
  ) {}

  static create(props: {
    current: number;
    total: number;
    behind?: number;
    ahead?: number;
  }): PageWindow {
    const { total, behind = DEFAULT_PAGES_BEHIND, ahead = DEFAULT_PAGES_AHEAD } = props;
    if (!Number.isInteger(total) || total < 0)
      throw new Error('[PageWindow] total must be a non-negative integer');
    if (behind < 0 || ahead < 0)
      throw new Error('[PageWindow] behind and ahead must be non-negative');
    const current = total === 0 ? 0 : Math.min(Math.max(Math.trunc(props.current), 0), total - 1);
    return new PageWindow(current, total, behind, ahead);
  }

  static fromPrimitive(data: PageWindowPrimitive): PageWindow {
    return PageWindow.create(data);
  }

  getCurrent(): number {
    return this.current;
  }

  contains(index: number): boolean {
    return (
      this.total > 0 &&
      index >= this.current - this.behind &&
      index <= this.current + this.ahead &&
      index >= 0 &&
      index < this.total
    );
  }

  /** Indices in load priority: current page, then the following pages, then the previous ones. */
  indicesByPriority(): number[] {
    if (this.total === 0) return [];
    const indices = [this.current];
    for (let i = 1; i <= this.ahead; i++) indices.push(this.current + i);
    for (let i = 1; i <= this.behind; i++) indices.push(this.current - i);
    return indices.filter((index) => index >= 0 && index < this.total);
  }

  toPrimitive(): PageWindowPrimitive {
    return { current: this.current, total: this.total, behind: this.behind, ahead: this.ahead };
  }

  equals(other: PageWindow): boolean {
    return (
      this.current === other.current &&
      this.total === other.total &&
      this.behind === other.behind &&
      this.ahead === other.ahead
    );
  }
}
