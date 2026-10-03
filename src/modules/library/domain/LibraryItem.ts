import {
  ReadingProgress,
  type ReadingProgressPrimitive,
} from '../../reading/domain/ReadingProgress';
import { Comic, type ComicPrimitive } from './Comic';

export interface LibraryItemPrimitive {
  comic: ComicPrimitive;
  progress: ReadingProgressPrimitive | null;
}

/** A comic in the library together with how far it has been read. */
export class LibraryItem {
  private constructor(
    private readonly comic: Comic,
    private readonly progress: ReadingProgress | null,
  ) {}

  static create(props: { comic: Comic; progress: ReadingProgress | null }): LibraryItem {
    if (props.progress && props.progress.getComicId() !== props.comic.getId()) {
      throw new Error('[LibraryItem] progress belongs to another comic');
    }
    return new LibraryItem(props.comic, props.progress);
  }

  static fromPrimitive(data: LibraryItemPrimitive): LibraryItem {
    return LibraryItem.create({
      comic: Comic.fromPrimitive(data.comic),
      progress: data.progress ? ReadingProgress.fromPrimitive(data.progress) : null,
    });
  }

  getComic(): Comic {
    return this.comic;
  }

  getProgress(): ReadingProgress | null {
    return this.progress;
  }

  withProgress(progress: ReadingProgress | null): LibraryItem {
    return LibraryItem.create({ comic: this.comic, progress });
  }

  isRead(): boolean {
    return this.progress?.isRead() ?? false;
  }

  /** Fraction read (0–1); 0 when never opened. */
  getProgressRatio(): number {
    return this.progress?.getRatio() ?? 0;
  }

  getLastReadAt(): number | null {
    return this.progress?.getLastReadAt() ?? null;
  }

  /** Page to resume from (0-based). */
  getResumePage(): number {
    return this.progress?.getCurrentPage() ?? 0;
  }

  toPrimitive(): LibraryItemPrimitive {
    return { comic: this.comic.toPrimitive(), progress: this.progress?.toPrimitive() ?? null };
  }

  equals(other: LibraryItem): boolean {
    return this.comic.equals(other.comic);
  }
}
