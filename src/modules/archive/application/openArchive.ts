import { ArchiveError } from '../domain/ArchiveError';
import { ARCHIVE_SIGNATURE_LENGTH, ArchiveFormat } from '../domain/ArchiveFormat';
import type { ArchiveRepository } from '../domain/ArchiveRepository';
import { OpenedComic } from '../domain/OpenedComic';
import { PageList } from '../domain/PageList';

interface OpenArchiveProps {
  archiveRepository: ArchiveRepository;
}

/** Detects the archive format, opens it and returns its pages in reading order. */
export function openArchive({ archiveRepository }: OpenArchiveProps) {
  return async (file: Blob): Promise<OpenedComic> => {
    if (file.size === 0) throw new ArchiveError('empty', '[openArchive] File is empty');

    const header = new Uint8Array(await file.slice(0, ARCHIVE_SIGNATURE_LENGTH).arrayBuffer());
    const format = ArchiveFormat.detect(header);
    if (!format) throw new ArchiveError('unsupported', '[openArchive] Unsupported archive format');

    const session = await archiveRepository.open(file, format);
    const pages = PageList.fromEntryPaths(session.getEntryPaths());
    if (pages.isEmpty()) {
      await archiveRepository.close(session.getId());
      throw new ArchiveError('empty', '[openArchive] Archive contains no images');
    }

    return OpenedComic.create({ sessionId: session.getId(), format, pages });
  };
}
