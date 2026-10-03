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
}

const DEFAULTS: SettingsPrimitive = {
  readingMode: ReadingMode.default().toPrimitive(),
  readingDirection: ReadingDirection.default().toPrimitive(),
  fitMode: FitMode.default().toPrimitive(),
  theme: 'system',
  language: 'system',
  brightness: 1,
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

  toPrimitive(): SettingsPrimitive {
    return { ...this.data };
  }

  equals(other: Settings): boolean {
    return JSON.stringify(this.data) === JSON.stringify(other.data);
  }
}
