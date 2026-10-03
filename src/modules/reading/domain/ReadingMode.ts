export const READING_MODES = ['single', 'double', 'webtoon'] as const;
export type ReadingModePrimitive = (typeof READING_MODES)[number];

/** How pages are laid out: one page, two-page spreads or a continuous vertical strip. */
export class ReadingMode {
  private constructor(private readonly value: ReadingModePrimitive) {}

  static default(): ReadingMode {
    return new ReadingMode('single');
  }

  static isReadingMode(value: unknown): value is ReadingModePrimitive {
    return typeof value === 'string' && (READING_MODES as readonly string[]).includes(value);
  }

  static fromPrimitive(data: ReadingModePrimitive): ReadingMode {
    if (!ReadingMode.isReadingMode(data)) {
      throw new Error(`[ReadingMode] Unknown reading mode: ${String(data)}`);
    }
    return new ReadingMode(data);
  }

  isSingle(): boolean {
    return this.value === 'single';
  }

  isDouble(): boolean {
    return this.value === 'double';
  }

  isWebtoon(): boolean {
    return this.value === 'webtoon';
  }

  toPrimitive(): ReadingModePrimitive {
    return this.value;
  }

  equals(other: ReadingMode): boolean {
    return this.value === other.value;
  }
}
