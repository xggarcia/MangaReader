import type { Comic } from './Comic';

export interface SeriesInfoPrimitive {
  /** Display name of the series. */
  name: string;
  /** Normalised name used to group volumes ("one piece" for "One_Piece"). */
  key: string;
  /** Volume or issue number used for ordering, `null` when none was found. */
  volume: number | null;
}

const ARCHIVE_EXTENSION = /\.(cbz|cbr|cb7|cbt|zip|rar|7z|tar|pdf|epub)$/i;
/** Tags such as [Group], {HQ} or (2019) (Digital) carry no series information. */
const TAGS = /\[[^\]]*\]|\{[^}]*\}|\([^)]*\)/g;
/** Explicit volume or issue markers: "Vol. 3", "v03", "Tomo 5", "T05", "Book 2", "#12". */
const VOLUME_MARKER =
  /(?:^|[\s\-_,.])(?:vol(?:ume|umen)?|v|tomo|t|tome|book|libro|band|bd|n[º°o]|no|#)\.?\s*(\d{1,4}(?:\.\d+)?)/i;
/** Chapter markers: "Chapter 12", "Ch.12", "c012", "Cap 3", "Capítulo 4", "Ep 7". */
const CHAPTER_MARKER =
  /(?:^|[\s\-_,.])(?:chapter|ch|c|cap(?:[ií]tulo)?|ep(?:isode|isodio)?)\.?\s*(\d{1,4}(?:\.\d+)?)/i;
/** A short trailing number ("Berserk 05", "Monster - 003"); 4 digits are usually a year. */
const TRAILING_NUMBER = /[\s\-_#]+(\d{1,3}(?:\.\d+)?)$/;
const SEPARATORS = /^[\s\-_:,.·|]+|[\s\-_:,.·|]+$/g;

function normalizeKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}

function parseNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(',', '.')) : null;
}

/** Splits "Series Name Vol. 3" into the series name and the volume number. */
function splitName(raw: string): { name: string; volume: number | null } {
  let text = raw
    .replace(ARCHIVE_EXTENSION, '')
    .replace(TAGS, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const pattern of [VOLUME_MARKER, CHAPTER_MARKER, TRAILING_NUMBER]) {
    const match = pattern.exec(text);
    if (match?.index !== undefined && match[1]) {
      const name = text.slice(0, match.index).replace(SEPARATORS, '');
      // Never strip everything: "Vol. 1" alone is a title, not a series.
      if (name) return { name, volume: Number(match[1]) };
    }
  }
  text = text.replace(SEPARATORS, '');
  return { name: text || raw, volume: null };
}

/**
 * Which series a comic belongs to and its position in it. Uses the series stored in the
 * comic (ComicInfo.xml or edited by the user) and otherwise infers it from the file name,
 * so volumes imported at different times end up together automatically.
 */
export class SeriesInfo {
  private constructor(private readonly data: Readonly<SeriesInfoPrimitive>) {}

  static fromComic(comic: Comic): SeriesInfo {
    const storedSeries = comic.getSeries();
    if (storedSeries) {
      const volume =
        parseNumber(comic.getNumber()) ?? splitName(comic.getFileName()).volume ?? null;
      return SeriesInfo.create({ name: storedSeries, volume });
    }
    const { name, volume } = splitName(comic.getFileName());
    return SeriesInfo.create({ name, volume: parseNumber(comic.getNumber()) ?? volume });
  }

  static fromName(rawName: string): SeriesInfo {
    return SeriesInfo.create(splitName(rawName));
  }

  static create(props: { name: string; volume: number | null }): SeriesInfo {
    const name = props.name.trim();
    if (name === '') throw new Error('[SeriesInfo] name must not be empty');
    const key = normalizeKey(name) || name.toLowerCase();
    return new SeriesInfo({ name, key, volume: props.volume });
  }

  static fromPrimitive(data: SeriesInfoPrimitive): SeriesInfo {
    return SeriesInfo.create(data);
  }

  getName(): string {
    return this.data.name;
  }

  getKey(): string {
    return this.data.key;
  }

  getVolume(): number | null {
    return this.data.volume;
  }

  toPrimitive(): SeriesInfoPrimitive {
    return { ...this.data };
  }

  /** Same series (volume aside). */
  equals(other: SeriesInfo): boolean {
    return this.data.key === other.data.key;
  }
}
