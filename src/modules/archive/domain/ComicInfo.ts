export interface ComicInfoPrimitive {
  title: string | null;
  series: string | null;
  number: string | null;
  writer: string | null;
}

const FILE_NAME = 'comicinfo.xml';

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Metadata from a ComicInfo.xml file (the de-facto standard used by comic tools). */
export class ComicInfo {
  private constructor(private readonly data: Readonly<ComicInfoPrimitive>) {}

  static create(props: Partial<ComicInfoPrimitive>): ComicInfo {
    return new ComicInfo({
      title: clean(props.title),
      series: clean(props.series),
      number: clean(props.number),
      writer: clean(props.writer),
    });
  }

  static fromPrimitive(data: ComicInfoPrimitive): ComicInfo {
    return ComicInfo.create(data);
  }

  /**
   * Path of the ComicInfo.xml entry in an archive (case-insensitive), preferring the one closest
   * to the root. Files inside macOS metadata folders are ignored.
   */
  static locateIn(entryPaths: readonly string[]): string | null {
    const candidates = entryPaths
      .map((path) => ({ path, segments: path.replace(/\\/g, '/').split('/') }))
      .filter(
        ({ segments }) =>
          segments[segments.length - 1]?.toLowerCase() === FILE_NAME &&
          !segments.some((segment) => segment.toLowerCase() === '__macosx'),
      )
      .sort((a, b) => a.segments.length - b.segments.length);
    return candidates[0]?.path ?? null;
  }

  getTitle(): string | null {
    return this.data.title;
  }

  getSeries(): string | null {
    return this.data.series;
  }

  getNumber(): string | null {
    return this.data.number;
  }

  getWriter(): string | null {
    return this.data.writer;
  }

  isEmpty(): boolean {
    return Object.values(this.data).every((value) => value === null);
  }

  toPrimitive(): ComicInfoPrimitive {
    return { ...this.data };
  }

  equals(other: ComicInfo): boolean {
    return JSON.stringify(this.data) === JSON.stringify(other.data);
  }
}
