import type { ComicFileRepository } from '../domain/ComicFileRepository';

/** The stored file of a comic (e.g. to send it to a paired device); `null` if it has none. */
export function getComicFile({
  comicFileRepository,
}: {
  comicFileRepository: ComicFileRepository;
}) {
  return (comicId: string): Promise<Blob | null> => comicFileRepository.get(comicId);
}
