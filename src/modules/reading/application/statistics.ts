import type { ActivityRepository } from '../domain/ActivityRepository';
import { ReadingDay, toLocalDay } from '../domain/ReadingDay';
import { ReadingStats } from '../domain/ReadingStats';

interface StatisticsProps {
  activityRepository: ActivityRepository;
  now?: () => number;
}

export interface RecordReadingInput {
  comicId: string;
  seconds: number;
  pages: number;
  finished: boolean;
}

/** Adds a slice of reading (time, pages, finished) to today's activity. */
export function recordReading({ activityRepository, now = Date.now }: StatisticsProps) {
  return async (input: RecordReadingInput): Promise<void> => {
    if (input.comicId.trim() === '') throw new Error('[recordReading] comicId is required');
    if (input.seconds <= 0 && input.pages <= 0 && !input.finished) return;
    const date = toLocalDay(now());
    const day = (await activityRepository.findByDate(date)) ?? ReadingDay.empty(date);
    await activityRepository.save(day.record(input));
  };
}

export function getReadingStats({ activityRepository, now = Date.now }: StatisticsProps) {
  return async (): Promise<ReadingStats> =>
    ReadingStats.fromDays(await activityRepository.findAll(), now());
}
