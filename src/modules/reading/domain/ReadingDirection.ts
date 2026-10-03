export type ReadingDirectionPrimitive = 'rtl' | 'ltr';
export type ScreenSide = 'left' | 'right';
/** +1 = next page, -1 = previous page. */
export type PageStep = 1 | -1;

/** Minimum horizontal travel (px) for a gesture to count as a swipe. */
export const SWIPE_THRESHOLD_PX = 50;

/** Reading direction: right-to-left (manga, default) or left-to-right (western comics). */
export class ReadingDirection {
  private constructor(private readonly value: ReadingDirectionPrimitive) {}

  static rightToLeft(): ReadingDirection {
    return new ReadingDirection('rtl');
  }

  static leftToRight(): ReadingDirection {
    return new ReadingDirection('ltr');
  }

  static default(): ReadingDirection {
    return ReadingDirection.rightToLeft();
  }

  static fromPrimitive(data: ReadingDirectionPrimitive): ReadingDirection {
    if (data !== 'rtl' && data !== 'ltr') {
      throw new Error(`[ReadingDirection] Unknown reading direction: ${String(data)}`);
    }
    return new ReadingDirection(data);
  }

  isRightToLeft(): boolean {
    return this.value === 'rtl';
  }

  /** Page step for a tap or arrow key on a side of the screen. In manga, the left side advances. */
  stepForSide(side: ScreenSide): PageStep {
    const forwardSide: ScreenSide = this.isRightToLeft() ? 'left' : 'right';
    return side === forwardSide ? 1 : -1;
  }

  /**
   * Page step for a horizontal swipe (`deltaX` > 0 means the finger moved right), or `null`
   * if the movement is too short. Pages follow the finger like a physical book.
   */
  stepForSwipe(deltaX: number): PageStep | null {
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return null;
    const movedRight = deltaX > 0;
    return movedRight === this.isRightToLeft() ? 1 : -1;
  }

  /** Left-to-right screen order of pages given in reading order (manga puts the first on the right). */
  arrangeForDisplay<T>(pagesInReadingOrder: readonly T[]): T[] {
    return this.isRightToLeft() ? [...pagesInReadingOrder].reverse() : [...pagesInReadingOrder];
  }

  toPrimitive(): ReadingDirectionPrimitive {
    return this.value;
  }

  equals(other: ReadingDirection): boolean {
    return this.value === other.value;
  }
}
