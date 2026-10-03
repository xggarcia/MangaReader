import { getDb } from '../../../shared/infrastructure/db';
import type { ProgressRepository } from '../domain/ProgressRepository';
import { IdbProgressRepository } from '../infrastructure/IdbProgressRepository';
import { getProgress } from './getProgress';
import { saveProgress } from './saveProgress';
import { setReadStatus } from './setReadStatus';

export function createReadingUseCases(progressRepository: ProgressRepository) {
  return {
    getProgress: getProgress({ progressRepository }),
    saveProgress: saveProgress({ progressRepository }),
    setReadStatus: setReadStatus({ progressRepository }),
  };
}

export type ReadingUseCases = ReturnType<typeof createReadingUseCases>;

let progressRepository: ProgressRepository | null = null;
let instance: ReadingUseCases | null = null;

export function getProgressRepository(): ProgressRepository {
  progressRepository ??= new IdbProgressRepository(getDb);
  return progressRepository;
}

export function getReadingUseCases(): ReadingUseCases {
  instance ??= createReadingUseCases(getProgressRepository());
  return instance;
}
