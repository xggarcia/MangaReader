export const PAGE_QUALITIES = ['high', 'balanced', 'compact'] as const;
export type PageQualityPrimitive = (typeof PAGE_QUALITIES)[number];

interface QualitySpec {
  /** Upper bound for the shorter side of a page, in pixels. */
  maxShortSide: number;
  /** Lossy encoder quality, from 0 to 1. */
  encoderQuality: number;
}

// Phone screens are ~1080-1290 px wide: "balanced" stays sharp at full width, "high" keeps
// detail for zooming. Limiting the shorter side keeps webtoon strips and spreads readable.
const SPECS: Readonly<Record<PageQualityPrimitive, QualitySpec>> = {
  high: { maxShortSide: 1600, encoderQuality: 0.82 },
  balanced: { maxShortSide: 1200, encoderQuality: 0.76 },
  compact: { maxShortSide: 900, encoderQuality: 0.7 },
};

/** How much pages are downscaled and recompressed when a comic is optimized to save space. */
export class PageQuality {
  private constructor(private readonly value: PageQualityPrimitive) {}

  static default(): PageQuality {
    return new PageQuality('balanced');
  }

  static isPageQuality(value: unknown): value is PageQualityPrimitive {
    return typeof value === 'string' && (PAGE_QUALITIES as readonly string[]).includes(value);
  }

  static fromPrimitive(data: PageQualityPrimitive): PageQuality {
    if (!PageQuality.isPageQuality(data)) {
      throw new Error(`[PageQuality] Unknown page quality: ${String(data)}`);
    }
    return new PageQuality(data);
  }

  /** Scale factor (at most 1) that fits a page of this size within the quality bounds. */
  scaleFor(width: number, height: number): number {
    const shortSide = Math.min(width, height);
    return shortSide > 0 ? Math.min(1, SPECS[this.value].maxShortSide / shortSide) : 1;
  }

  getEncoderQuality(): number {
    return SPECS[this.value].encoderQuality;
  }

  toPrimitive(): PageQualityPrimitive {
    return this.value;
  }

  equals(other: PageQuality): boolean {
    return this.value === other.value;
  }
}
