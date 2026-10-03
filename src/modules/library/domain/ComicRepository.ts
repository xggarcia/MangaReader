import type { Comic } from './Comic';

export interface ComicRepository {
  save(comic: Comic): Promise<void>;
  findById(id: string): Promise<Comic | null>;
  findAll(): Promise<Comic[]>;
  delete(id: string): Promise<void>;
}
