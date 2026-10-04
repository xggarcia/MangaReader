import { PageQuality, type PageQualityPrimitive } from '../../archive/domain/PageQuality';
import { FitMode, type FitModePrimitive } from '../../reading/domain/FitMode';
import {
  ReadingDirection,
  type ReadingDirectionPrimitive,
} from '../../reading/domain/ReadingDirection';
import { ReadingMode, type ReadingModePrimitive } from '../../reading/domain/ReadingMode';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export const LANGUAGES = ['system', 'es', 'en'] as const;
export type LanguagePreference = (typeof LANGUAGES)[number];

/** Optimize new comics on import at this quality, or keep the files as they are. */
export type ImportOptimization = 'off' | PageQualityPrimitive;

/** When the original file is deleted after the library keeps its own copy. */
export const DELETE_ORIGINALS = ['never', 'afterReduce', 'always'] as const;
export type DeleteOriginals = (typeof DELETE_ORIGINALS)[number];

/** Folder on the device watched for new comics (granted through the system picker). */
export interface ComicsFolderSetting {
  uri: string;
  name: string;
}

export const MIN_BRIGHTNESS = 0.2;
export const MAX_BRIGHTNESS = 1;

export interface SettingsPrimitive {
  readingMode: ReadingModePrimitive;
  readingDirection: ReadingDirectionPrimitive;
  fitMode: FitModePrimitive;
  theme: Theme;
  language: LanguagePreference;
  /** Reader brightness, from MIN_BRIGHTNESS to 1. */
  brightness: number;
  importOptimization: ImportOptimization;
  comicsFolder: ComicsFolderSetting | null;
  deleteOriginals: DeleteOriginals;
}

const DEFAULTS: SettingsPrimitive = {
  readingMode: ReadingMode.default().toPrimitive(),
  readingDirection: ReadingDirection.default().toPrimitive(),
  fitMode: FitMode.default().toPrimitive(),
  theme: 'system',
  language: 'system',
  brightness: 1,
  importOptimization: 'off',
  comicsFolder: null,
  deleteOriginals: 'afterReduce',
};

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value);

/** User preferences. Immutable; unknown or invalid stored values fall back to defaults. */
export class Settings {
  private constructor(private readonly data: Readonly<SettingsPrimitive>) {}

  static defaults(): Settings {
    return new Settings({ ...DEFAULTS });
  }

  static create(props: SettingsPrimitive): Settings {
    Settings.ensureIsValid(props);
    return new Settings({ ...props });
  }

  /** Lenient: keeps valid stored fields and fills the rest with defaults (forward compatible). */
  static fromPrimitive(data: Partial<Record<keyof SettingsPrimitive, unknown>>): Settings {
    return new Settings({
      readingMode: ReadingMode.isReadingMode(data.readingMode)
        ? data.readingMode
        : DEFAULTS.readingMode,
      readingDirection:
        data.readingDirection === 'rtl' || data.readingDirection === 'ltr'
          ? data.readingDirection
          : DEFAULTS.readingDirection,
      fitMode: FitMode.isFitMode(data.fitMode) ? data.fitMode : DEFAULTS.fitMode,
      theme: isOneOf(THEMES, data.theme) ? data.theme : DEFAULTS.theme,
      language: isOneOf(LANGUAGES, data.language) ? data.language : DEFAULTS.language,
      brightness: Settings.isValidBrightness(data.brightness)
        ? data.brightness
        : DEFAULTS.brightness,
      importOptimization: Settings.isImportOptimization(data.importOptimization)
        ? data.importOptimization
        : DEFAULTS.importOptimization,
      comicsFolder: Settings.isComicsFolder(data.comicsFolder)
        ? { uri: data.comicsFolder.uri, name: data.comicsFolder.name }
        : DEFAULTS.comicsFolder,
      deleteOriginals: isOneOf(DELETE_ORIGINALS, data.deleteOriginals)
        ? data.deleteOriginals
        : DEFAULTS.deleteOriginals,
    });
  }

  static ensureIsValid(props: SettingsPrimitive): void {
    ReadingMode.fromPrimitive(props.readingMode);
    ReadingDirection.fromPrimitive(props.readingDirection);
    FitMode.fromPrimitive(props.fitMode);
    if (!isOneOf(THEMES, props.theme)) throw new Error(`[Settings] Unknown theme: ${props.theme}`);
    if (!isOneOf(LANGUAGES, props.language)) {
      throw new Error(`[Settings] Unknown language: ${props.language}`);
    }
    if (!Settings.isValidBrightness(props.brightness)) {
      throw new Error(`[Settings] Brightness out of range: ${props.brightness}`);
    }
    if (props.comicsFolder !== null && !Settings.isComicsFolder(props.comicsFolder)) {
      throw new Error('[Settings] Invalid comics folder');
    }
    if (!isOneOf(DELETE_ORIGINALS, props.deleteOriginals)) {
      throw new Error(`[Settings] Unknown delete originals mode: ${props.deleteOriginals}`);
    }
    if (!Settings.isImportOptimization(props.importOptimization)) {
      throw new Error(`[Settings] Unknown import optimization: ${props.importOptimization}`);
    }
  }

  private static isComicsFolder(value: unknown): value is ComicsFolderSetting {
    const folder = value as Partial<ComicsFolderSetting> | null;
    return (
      typeof folder === 'object' &&
      folder !== null &&
      typeof folder.uri === 'string' &&
      folder.uri !== '' &&
      typeof folder.name === 'string'
    );
  }

  private static isImportOptimization(value: unknown): value is ImportOptimization {
    return value === 'off' || PageQuality.isPageQuality(value);
  }

  private static isValidBrightness(value: unknown): value is number {
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= MIN_BRIGHTNESS &&
      value <= MAX_BRIGHTNESS
    );
  }

  /** New settings with some fields changed (validated). */
  with(changes: Partial<SettingsPrimitive>): Settings {
    return Settings.create({ ...this.data, ...changes });
  }

  getReadingMode(): ReadingMode {
    return ReadingMode.fromPrimitive(this.data.readingMode);
  }

  getReadingDirection(): ReadingDirection {
    return ReadingDirection.fromPrimitive(this.data.readingDirection);
  }

  getFitMode(): FitMode {
    return FitMode.fromPrimitive(this.data.fitMode);
  }

  getTheme(): Theme {
    return this.data.theme;
  }

  getLanguage(): LanguagePreference {
    return this.data.language;
  }

  getBrightness(): number {
    return this.data.brightness;
  }

  /** Quality new comics are optimized to on import; `null` keeps them as they are. */
  getImportOptimization(): PageQuality | null {
    const value = this.data.importOptimization;
    return value === 'off' ? null : PageQuality.fromPrimitive(value);
  }

  getComicsFolder(): ComicsFolderSetting | null {
    return this.data.comicsFolder ? { ...this.data.comicsFolder } : null;
  }

  getDeleteOriginals(): DeleteOriginals {
    return this.data.deleteOriginals;
  }

  toPrimitive(): SettingsPrimitive {
    return { ...this.data };
  }

  equals(other: Settings): boolean {
    return JSON.stringify(this.data) === JSON.stringify(other.data);
  }
}
