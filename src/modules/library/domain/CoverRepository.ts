/** Small cover thumbnails shown in the library grid. */
export interface CoverRepository {
  save(comicId: string, cover: Blob): Promise<void>;
  get(comicId: string): Promise<Blob | null>;
  delete(comicId: string): Promise<void>;
}
