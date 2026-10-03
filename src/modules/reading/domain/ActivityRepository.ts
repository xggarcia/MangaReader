import type { ReadingDay } from './ReadingDay';

/** Daily reading activity used for statistics. */
export interface ActivityRepository {
  /** The stored day, or `null` when nothing was read that day. */
  findByDate(date: string): Promise<ReadingDay | null>;
  findAll(): Promise<ReadingDay[]>;
  save(day: ReadingDay): Promise<void>;
}
