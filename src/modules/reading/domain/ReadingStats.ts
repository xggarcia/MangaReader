import { toLocalDay, type ReadingDay } from './ReadingDay';

export interface DailyTotal {
  date: string;
  seconds: number;
  pages: number;
}

export interface YearRecap {
  year: number;
  seconds: number;
  pages: number;
  finishedComics: number;
  activeDays: number;
  longestStreak: number;
  /** 0-based month with the most reading time, or `null` without activity. */
  busiestMonth: number | null;
  /** Reading seconds per month, January first. */
  monthlySeconds: number[];
}

export interface ReadingStatsPrimitive {
  totalSeconds: number;
  totalPages: number;
  finishedComics: number;
  startedComics: number;
  currentStreak: number;
  longestStreak: number;
  lastSevenDays: DailyTotal[];
  year: YearRecap;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: string, days: number): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  // Noon avoids daylight-saving edges when stepping whole days.
  return toLocalDay(new Date(year, month - 1, day, 12).getTime() + days * DAY_MS);
}

/** Longest run of consecutive active days in a sorted list of dates. */
function longestRun(sortedDates: readonly string[]): number {
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of sortedDates) {
    run = previous !== null && addDays(previous, 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }
  return longest;
}

/**
 * Reading statistics derived from daily activity: totals, streaks, the last week and the
 * current year's recap. A streak still counts if the last reading day was yesterday.
 */
export class ReadingStats {
  private constructor(private readonly data: Readonly<ReadingStatsPrimitive>) {}

  static fromDays(days: readonly ReadingDay[], now: number): ReadingStats {
    const today = toLocalDay(now);
    const active = days.filter((day) => day.hasActivity());
    const byDate = new Map(active.map((day) => [day.getDate(), day]));
    const sortedDates = [...byDate.keys()].sort();

    let currentStreak = 0;
    let cursor = byDate.has(today) ? today : addDays(today, -1);
    while (byDate.has(cursor)) {
      currentStreak++;
      cursor = addDays(cursor, -1);
    }

    const finished = new Set(active.flatMap((day) => day.getFinishedComicIds()));
    const started = new Set(active.flatMap((day) => day.getComicIds()));

    const lastSevenDays: DailyTotal[] = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = addDays(today, -offset);
      const day = byDate.get(date);
      lastSevenDays.push({ date, seconds: day?.getSeconds() ?? 0, pages: day?.getPages() ?? 0 });
    }

    const year = new Date(now).getFullYear();
    const yearPrefix = `${year}-`;
    const yearDays = active.filter((day) => day.getDate().startsWith(yearPrefix));
    const monthlySeconds = Array.from({ length: 12 }, () => 0);
    for (const day of yearDays) {
      const month = Number(day.getDate().slice(5, 7)) - 1;
      monthlySeconds[month] = (monthlySeconds[month] ?? 0) + day.getSeconds();
    }
    const maxMonth = Math.max(...monthlySeconds);

    return new ReadingStats({
      totalSeconds: active.reduce((sum, day) => sum + day.getSeconds(), 0),
      totalPages: active.reduce((sum, day) => sum + day.getPages(), 0),
      finishedComics: finished.size,
      startedComics: started.size,
      currentStreak,
      longestStreak: longestRun(sortedDates),
      lastSevenDays,
      year: {
        year,
        seconds: yearDays.reduce((sum, day) => sum + day.getSeconds(), 0),
        pages: yearDays.reduce((sum, day) => sum + day.getPages(), 0),
        finishedComics: new Set(yearDays.flatMap((day) => day.getFinishedComicIds())).size,
        activeDays: yearDays.length,
        longestStreak: longestRun(yearDays.map((day) => day.getDate()).sort()),
        busiestMonth: maxMonth > 0 ? monthlySeconds.indexOf(maxMonth) : null,
        monthlySeconds,
      },
    });
  }

  isEmpty(): boolean {
    return this.data.totalSeconds === 0 && this.data.totalPages === 0;
  }

  toPrimitive(): ReadingStatsPrimitive {
    return {
      ...this.data,
      lastSevenDays: this.data.lastSevenDays.map((day) => ({ ...day })),
      year: { ...this.data.year, monthlySeconds: [...this.data.year.monthlySeconds] },
    };
  }

  equals(other: ReadingStats): boolean {
    return JSON.stringify(this.data) === JSON.stringify(other.data);
  }
}
