import type { ReadingProgress } from './ReadingProgress';

export interface ProgressRepository {
  save(progress: ReadingProgress): Promise<void>;
  findByComicId(comicId: string): Promise<ReadingProgress | null>;
  findAll(): Promise<ReadingProgress[]>;
  delete(comicId: string): Promise<void>;
}
