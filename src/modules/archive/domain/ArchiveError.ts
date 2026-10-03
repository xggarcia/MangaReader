export const ARCHIVE_ERROR_CODES = ['corrupt', 'unsupported', 'empty'] as const;
export type ArchiveErrorCode = (typeof ARCHIVE_ERROR_CODES)[number];

/** User-facing archive failure. `code` maps to the i18n key `errors.archive.<code>`. */
export class ArchiveError extends Error {
  readonly code: ArchiveErrorCode;

  constructor(code: ArchiveErrorCode, message: string = code) {
    super(message);
    this.name = 'ArchiveError';
    this.code = code;
  }

  static isArchiveError(error: unknown): error is ArchiveError {
    return error instanceof ArchiveError;
  }

  static isArchiveErrorCode(value: unknown): value is ArchiveErrorCode {
    return typeof value === 'string' && (ARCHIVE_ERROR_CODES as readonly string[]).includes(value);
  }
}
