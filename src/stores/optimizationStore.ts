import { create } from 'zustand';
import { PageQuality, type PageQualityPrimitive } from '../modules/archive/domain/PageQuality';
import { getLibraryUseCases } from '../modules/library/application/factory';
import { setKeepScreenOn } from '../shared/infrastructure/screenWakeLock';
import { useLibraryStore } from './libraryStore';
import { useSettingsStore } from './settingsStore';

interface OptimizationJob {
  comicId: string;
  quality: PageQualityPrimitive;
}

export interface OptimizationCurrent {
  comicId: string;
  title: string;
  page: number;
  pages: number;
}

export interface OptimizationSummary {
  optimized: number;
  failed: number;
  savedBytes: number;
}

interface OptimizationState {
  queue: OptimizationJob[];
  current: OptimizationCurrent | null;
  /** Comics finished in this run, out of `total`. */
  done: number;
  total: number;
  stopping: boolean;
  run: OptimizationSummary;
  /** Result of the last finished run, shown briefly. */
  summary: OptimizationSummary | null;
  /**
   * Queues comics to be optimized one by one, skipping those already at that quality.
   * `onDone` is called for each comic once the library holds its final copy (`ok`), or when it
   * could not be processed.
   */
  enqueue: (
    comicIds: readonly string[],
    quality: PageQuality,
    onDone?: (comicId: string, ok: boolean) => void,
  ) => void;
  /** Optimizes freshly imported comics when the import setting asks for it. */
  optimizeImported: (comicIds: readonly string[]) => void;
  /** Drops the pending comics; the one in progress finishes safely. */
  stop: () => void;
  dismissSummary: () => void;
}

const EMPTY_RUN: OptimizationSummary = { optimized: 0, failed: 0, savedBytes: 0 };
const SUMMARY_VISIBLE_MS = 8000;

export const useOptimizationStore = create<OptimizationState>((set, get) => {
  let processing = false;
  let summaryTimer: ReturnType<typeof setTimeout> | undefined;
  const doneCallbacks = new Map<string, (comicId: string, ok: boolean) => void>();
  const finish = (comicId: string, ok: boolean) => {
    const callback = doneCallbacks.get(comicId);
    doneCallbacks.delete(comicId);
    callback?.(comicId, ok);
  };

  const processQueue = async () => {
    if (processing) return;
    processing = true;
    void setKeepScreenOn(true);
    try {
      for (let job = get().queue[0]; job; job = get().queue[0]) {
        const { comicId, quality } = job;
        const comic = useLibraryStore.getState().items.findById(comicId)?.getComic();
        set({
          queue: get().queue.slice(1),
          current: comic
            ? { comicId, title: comic.getTitle(), page: 0, pages: comic.getPageCount() }
            : null,
        });
        if (!comic) finish(comicId, false);
        if (comic) {
          try {
            const result = await getLibraryUseCases().optimizeComic(
              comicId,
              PageQuality.fromPrimitive(quality),
              (page, pages) => {
                const current = get().current;
                if (current?.comicId === comicId) set({ current: { ...current, page, pages } });
              },
            );
            useLibraryStore.getState().replaceComic(result.comic);
            finish(comicId, true);
            const run = get().run;
            if (result.status === 'optimized') {
              set({
                run: {
                  ...run,
                  optimized: run.optimized + 1,
                  savedBytes: run.savedBytes + result.savedBytes,
                },
              });
            }
          } catch {
            finish(comicId, false);
            set({ run: { ...get().run, failed: get().run.failed + 1 } });
          }
        }
        set({ done: get().done + 1 });
      }
    } finally {
      processing = false;
      void setKeepScreenOn(false);
      set({
        current: null,
        done: 0,
        total: 0,
        stopping: false,
        summary: get().run,
        run: EMPTY_RUN,
      });
      clearTimeout(summaryTimer);
      summaryTimer = setTimeout(() => set({ summary: null }), SUMMARY_VISIBLE_MS);
    }
  };

  return {
    queue: [],
    current: null,
    done: 0,
    total: 0,
    stopping: false,
    run: EMPTY_RUN,
    summary: null,

    enqueue: (comicIds, quality, onDone) => {
      const { queue, current } = get();
      const pending = new Set([...queue.map((job) => job.comicId), current?.comicId]);
      const items = useLibraryStore.getState().items;
      const jobs: OptimizationJob[] = [];
      for (const comicId of comicIds) {
        const comic = items.findById(comicId)?.getComic();
        if (pending.has(comicId)) continue;
        // Archived comics have no file to optimize.
        if (!comic || comic.isArchived() || comic.isOptimizedAs(quality)) {
          onDone?.(comicId, comic !== undefined && !comic.isArchived());
          continue;
        }
        if (onDone) doneCallbacks.set(comicId, onDone);
        jobs.push({ comicId, quality: quality.toPrimitive() });
      }
      if (jobs.length === 0) return;
      clearTimeout(summaryTimer);
      set({ queue: [...queue, ...jobs], total: get().total + jobs.length, summary: null });
      void processQueue();
    },

    optimizeImported: (comicIds) => {
      const quality = useSettingsStore.getState().settings.getImportOptimization();
      if (quality) get().enqueue(comicIds, quality);
    },

    stop: () => {
      const dropped = get().queue.length;
      for (const job of get().queue) finish(job.comicId, false);
      set({ queue: [], total: get().total - dropped, stopping: get().current !== null });
    },

    dismissSummary: () => {
      clearTimeout(summaryTimer);
      set({ summary: null });
    },
  };
});
