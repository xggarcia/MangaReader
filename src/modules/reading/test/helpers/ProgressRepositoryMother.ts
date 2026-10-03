import { vi, type Mocked } from 'vitest';
import type { ProgressRepository } from '../../domain/ProgressRepository';

export function aProgressRepository(
  overrides: Partial<ProgressRepository> = {},
): Mocked<ProgressRepository> {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findByComicId: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as Mocked<ProgressRepository>;
}
