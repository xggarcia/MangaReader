import type { ProgressRepository } from '../domain/ProgressRepository';
import type { ReadingProgress } from '../domain/ReadingProgress';

interface GetProgressProps {
  progressRepository: ProgressRepository;
}

export function getProgress({ progressRepository }: GetProgressProps) {
  return async (comicId: string): Promise<ReadingProgress | null> => {
    if (comicId.trim() === '') throw new Error('[getProgress] comicId is required');
    return progressRepository.findByComicId(comicId);
  };
}
