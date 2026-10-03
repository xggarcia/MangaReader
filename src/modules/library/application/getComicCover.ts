import type { CoverRepository } from '../domain/CoverRepository';

interface GetComicCoverProps {
  coverRepository: CoverRepository;
}

export function getComicCover({ coverRepository }: GetComicCoverProps) {
  return async (comicId: string): Promise<Blob | null> => coverRepository.get(comicId);
}
