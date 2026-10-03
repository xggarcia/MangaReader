export const FIT_MODES = ['height', 'width', 'original'] as const;
export type FitModePrimitive = (typeof FIT_MODES)[number];

/**
 * How a page is scaled: whole page visible (`height`), filling the screen width (`width`,
 * scroll vertically) or at its original size (`original`, pan in any direction).
 */
export class FitMode {
  private constructor(private readonly value: FitModePrimitive) {}

  static default(): FitMode {
    return new FitMode('height');
  }

  static isFitMode(value: unknown): value is FitModePrimitive {
    return typeof value === 'string' && (FIT_MODES as readonly string[]).includes(value);
  }

  static fromPrimitive(data: FitModePrimitive): FitMode {
    if (!FitMode.isFitMode(data)) throw new Error(`[FitMode] Unknown fit mode: ${String(data)}`);
    return new FitMode(data);
  }

  toPrimitive(): FitModePrimitive {
    return this.value;
  }

  equals(other: FitMode): boolean {
    return this.value === other.value;
  }
}
