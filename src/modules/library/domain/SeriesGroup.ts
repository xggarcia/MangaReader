import type { LibraryItem } from './LibraryItem';
import { SeriesInfo } from './SeriesInfo';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function compareVolumes(a: LibraryItem, b: LibraryItem): number {
  const volumeA = a.getSeries().getVolume();
  const volumeB = b.getSeries().getVolume();
  if (volumeA !== null && volumeB !== null && volumeA !== volumeB) return volumeA - volumeB;
  if (volumeA !== null && volumeB === null) return -1;
  if (volumeA === null && volumeB !== null) return 1;
  return collator.compare(a.getComic().getFileName(), b.getComic().getFileName());
}

/** All the volumes of one series in the library, ordered by volume number. Immutable. */
export class SeriesGroup {
  private constructor(
    private readonly key: string,
    private readonly name: string,
    private readonly volumes: readonly LibraryItem[],
  ) {}

  static create(items: readonly LibraryItem[]): SeriesGroup {
    const first = items[0];
    if (!first) throw new Error('[SeriesGroup] A series needs at least one volume');
    const series = first.getSeries();
    if (items.some((item) => item.getSeries().getKey() !== series.getKey())) {
      throw new Error('[SeriesGroup] All volumes must belong to the same series');
    }
    return new SeriesGroup(series.getKey(), series.getName(), [...items].sort(compareVolumes));
  }

  getKey(): string {
    return this.key;
  }

  getName(): string {
    return this.name;
  }

  getVolumes(): LibraryItem[] {
    return [...this.volumes];
  }

  count(): number {
    return this.volumes.length;
  }

  /** A single comic, shown on its own rather than as a stack. */
  isSingle(): boolean {
    return this.volumes.length === 1;
  }

  /** The volume whose cover represents the series (the first one). */
  getCoverItem(): LibraryItem {
    return this.volumes[0] as LibraryItem;
  }

  getSeries(): SeriesInfo {
    return SeriesInfo.create({ name: this.name, volume: null });
  }

  countByStatus(status: 'unread' | 'inProgress' | 'read'): number {
    return this.volumes.filter((item) => item.getStatus() === status).length;
  }

  isFinished(): boolean {
    return this.volumes.every((item) => item.isRead());
  }

  /** Where to continue: the volume in progress, else the first unread one, else the first. */
  getNextToRead(): LibraryItem {
    return (
      this.volumes.find((item) => item.getStatus() === 'inProgress') ??
      this.volumes.find((item) => item.getStatus() === 'unread') ??
      this.getCoverItem()
    );
  }

  /** Fraction of volumes finished (a started volume counts by its own progress). */
  getProgressRatio(): number {
    const total = this.volumes.reduce((sum, item) => sum + item.getProgressRatio(), 0);
    return total / this.volumes.length;
  }

  getLastReadAt(): number | null {
    const times = this.volumes
      .map((item) => item.getLastReadAt())
      .filter((time): time is number => time !== null);
    return times.length > 0 ? Math.max(...times) : null;
  }

  getLastAddedAt(): number {
    return Math.max(...this.volumes.map((item) => item.getComic().getAddedAt()));
  }

  equals(other: SeriesGroup): boolean {
    return this.key === other.key;
  }
}
