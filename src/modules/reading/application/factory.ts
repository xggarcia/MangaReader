import { getDb } from '../../../shared/infrastructure/db';
import type { ActivityRepository } from '../domain/ActivityRepository';
import type { ProgressRepository } from '../domain/ProgressRepository';
import { IdbActivityRepository } from '../infrastructure/IdbActivityRepository';
import { IdbProgressRepository } from '../infrastructure/IdbProgressRepository';
import { getProgress } from './getProgress';
import { saveProgress } from './saveProgress';
import { setReadStatus } from './setReadStatus';
import { getReadingStats, recordReading } from './statistics';

export function createReadingUseCases(
  progressRepository: ProgressRepository,
  activityRepository: ActivityRepository,
) {
  return {
    getProgress: getProgress({ progressRepository }),
    saveProgress: saveProgress({ progressRepository }),
    setReadStatus: setReadStatus({ progressRepository }),
    recordReading: recordReading({ activityRepository }),
    getReadingStats: getReadingStats({ activityRepository }),
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
  instance ??= createReadingUseCases(getProgressRepository(), new IdbActivityRepository(getDb));
  return instance;
}
