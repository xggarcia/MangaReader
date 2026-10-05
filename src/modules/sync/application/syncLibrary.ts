import type { ComicRepository } from '../../library/domain/ComicRepository';
import type { CoverRepository } from '../../library/domain/CoverRepository';
import type { ProgressRepository } from '../../reading/domain/ProgressRepository';
import { SyncEntry, type SyncEntryPrimitive } from '../domain/SyncEntry';
import type { SyncCover } from '../domain/SyncMessage';

interface SyncLibraryProps {
  comicRepository: ComicRepository;
  progressRepository: ProgressRepository;
}

export interface ApplyResult {
  /** Comics whose progress changed here, or that appeared here as cover-only records. */
  changed: number;
  /** Ids (on the other device) of the comics whose cover is needed here. */
  coversWanted: string[];
}

/** Every comic with reading progress here: what a paired device needs to catch up. */
export function buildSyncManifest({ comicRepository, progressRepository }: SyncLibraryProps) {
  return async (): Promise<SyncEntryPrimitive[]> => {
    const [comics, progress] = await Promise.all([
      comicRepository.findAll(),
      progressRepository.findAll(),
    ]);
    const progressById = new Map(progress.map((item) => [item.getComicId(), item]));
    return comics.flatMap((comic) => {
      const comicProgress = progressById.get(comic.getId());
      return comicProgress ? [SyncEntry.fromLibrary(comic, comicProgress).toPrimitive()] : [];
    });
  };
}

/**
 * Merges what a paired device has read: the most recent progress wins for comics on both, and
 * comics only read there appear here as cover-only records (import the file to read them).
 */
export function applySyncManifest({
  comicRepository,
  progressRepository,
  now = Date.now,
}: SyncLibraryProps & { now?: () => number }) {
  return async (entries: readonly SyncEntryPrimitive[]): Promise<ApplyResult> => {
    const comics = await comicRepository.findAll();
    let changed = 0;
    const coversWanted: string[] = [];

    for (const primitive of entries) {
      let entry: SyncEntry;
      try {
        entry = SyncEntry.fromPrimitive(primitive);
      } catch {
        continue;
      }
      const local = comics.find((comic) => entry.matches(comic));
      if (local) {
        const localProgress = await progressRepository.findByComicId(local.getId());
        if (!localProgress || entry.getUpdatedAt() > localProgress.getUpdatedAt()) {
          await progressRepository.save(entry.progressFor(local));
          changed++;
        }
        continue;
      }
      const coverOnly = entry.toCoverOnlyComic(now());
      await comicRepository.save(coverOnly);
      await progressRepository.save(entry.progressFor(coverOnly));
      comics.push(coverOnly);
      coversWanted.push(entry.getId());
      changed++;
    }
    return { changed, coversWanted };
  };
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(data: string): Uint8Array<ArrayBuffer> {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** The covers a paired device asked for (comics it does not have). */
export function readSyncCovers({ coverRepository }: { coverRepository: CoverRepository }) {
  return async (ids: readonly string[]): Promise<SyncCover[]> => {
    const covers: SyncCover[] = [];
    for (const id of ids) {
      const cover = await coverRepository.get(id);
      if (cover) {
        covers.push({
          id,
          type: cover.type,
          data: toBase64(new Uint8Array(await cover.arrayBuffer())),
        });
      }
    }
    return covers;
  };
}

/** Stores covers received for cover-only comics (same ids as on the device that sent them). */
export function saveSyncCovers({
  comicRepository,
  coverRepository,
}: {
  comicRepository: ComicRepository;
  coverRepository: CoverRepository;
}) {
  return async (covers: readonly SyncCover[]): Promise<void> => {
    for (const cover of covers) {
      if (!(await comicRepository.findById(cover.id))) continue;
      await coverRepository.save(
        cover.id,
        new Blob([fromBase64(cover.data)], { type: cover.type }),
      );
    }
  };
}
