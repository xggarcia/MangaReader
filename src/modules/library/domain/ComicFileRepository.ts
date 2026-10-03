/**
 * Private on-device copy of each comic file, so the library keeps working after the original
 * is moved or deleted. Throws LibraryError('quotaExceeded') when the device runs out of space.
 */
export interface ComicFileRepository {
  /** Creates or replaces the copy; a failed replacement keeps the previous file. */
  save(comicId: string, file: Blob): Promise<void>;
  get(comicId: string): Promise<Blob | null>;
  delete(comicId: string): Promise<void>;
}
