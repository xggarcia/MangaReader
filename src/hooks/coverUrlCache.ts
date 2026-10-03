import { getLibraryUseCases } from '../modules/library/application/factory';

interface Entry {
  url: string | null;
  loading: Promise<string | null> | null;
  users: number;
  releaseTimer: ReturnType<typeof setTimeout> | null;
}

// Covers stay alive briefly after their last user leaves, so the reader can reuse the cover
// for its opening animation and the library grid reappears instantly when coming back.
const RELEASE_DELAY_MS = 30_000;
const entries = new Map<string, Entry>();

function entryFor(comicId: string): Entry {
  let entry = entries.get(comicId);
  if (!entry) {
    entry = { url: null, loading: null, users: 0, releaseTimer: null };
    entries.set(comicId, entry);
  }
  return entry;
}

/** Shared, reference-counted object URLs for cover thumbnails. */
export const coverUrlCache = {
  peek(comicId: string): string | null {
    return entries.get(comicId)?.url ?? null;
  },

  async acquire(comicId: string): Promise<string | null> {
    const entry = entryFor(comicId);
    entry.users++;
    if (entry.releaseTimer) clearTimeout(entry.releaseTimer);
    entry.releaseTimer = null;
    if (entry.url) return entry.url;
    entry.loading ??= getLibraryUseCases()
      .getComicCover(comicId)
      .then((cover) => {
        entry.url = cover ? URL.createObjectURL(cover) : null;
        return entry.url;
      })
      .catch(() => null)
      .finally(() => {
        entry.loading = null;
      });
    return entry.loading;
  },

  release(comicId: string): void {
    const entry = entries.get(comicId);
    if (!entry) return;
    entry.users = Math.max(0, entry.users - 1);
    if (entry.users > 0 || entry.releaseTimer) return;
    entry.releaseTimer = setTimeout(() => {
      if (entry.users > 0) return;
      if (entry.url) URL.revokeObjectURL(entry.url);
      entries.delete(comicId);
    }, RELEASE_DELAY_MS);
  },

  /** Drops a cover immediately (comic removed from the library). */
  forget(comicId: string): void {
    const entry = entries.get(comicId);
    if (entry?.releaseTimer) clearTimeout(entry.releaseTimer);
    if (entry?.url) URL.revokeObjectURL(entry.url);
    entries.delete(comicId);
  },
};
