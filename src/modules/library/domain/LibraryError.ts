export const LIBRARY_ERROR_CODES = [
  'quotaExceeded',
  'duplicate',
  'notFound',
  'invalidExport',
] as const;
export type LibraryErrorCode = (typeof LIBRARY_ERROR_CODES)[number];

/** User-facing library failure. `code` maps to the i18n key `errors.library.<code>`. */
export class LibraryError extends Error {
  readonly code: LibraryErrorCode;

  constructor(code: LibraryErrorCode, message: string = code) {
    super(message);
    this.name = 'LibraryError';
    this.code = code;
  }

  static isLibraryError(error: unknown): error is LibraryError {
    return error instanceof LibraryError;
  }
}
