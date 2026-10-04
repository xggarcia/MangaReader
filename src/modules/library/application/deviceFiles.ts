import type { Comic } from '../domain/Comic';
import type { DeviceFile } from '../domain/DeviceFile';
import type {
  ComicsFolder,
  DeviceFileRepository,
  ExportedFile,
} from '../domain/DeviceFileRepository';
import type { ComicRepository } from '../domain/ComicRepository';
import type { ImportSource } from './importComics';

interface DeviceFilesProps {
  deviceFileRepository: DeviceFileRepository;
}

export interface FolderContents {
  /** Comic archives not in the library yet. */
  comics: DeviceFile[];
  /** Libraries exported from MangaReader (e.g. sent from another device). */
  exports: DeviceFile[];
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function byPath(a: DeviceFile, b: DeviceFile): number {
  return collator.compare(`${a.getFolder()}/${a.getName()}`, `${b.getFolder()}/${b.getName()}`);
}

/** What is waiting in the comics folder: new comics (not imported yet) and library exports. */
export function findNewInFolder({
  deviceFileRepository,
  comicRepository,
}: DeviceFilesProps & { comicRepository: ComicRepository }) {
  return async (folderUri: string): Promise<FolderContents> => {
    const [files, library] = await Promise.all([
      deviceFileRepository.listFolder(folderUri),
      comicRepository.findAll(),
    ]);
    const isImported = (file: DeviceFile) =>
      library.some((comic: Comic) =>
        comic.isSameFileAs({ name: file.getName(), size: file.getSize() }),
      );
    return {
      comics: files.filter((file) => file.isComicArchive() && !isImported(file)).sort(byPath),
      exports: files.filter((file) => file.isLibraryExport()).sort(byPath),
    };
  };
}

/** A device file as an import source, copied in only when its turn comes. */
export function deviceFileSource({ deviceFileRepository }: DeviceFilesProps) {
  return (file: DeviceFile): ImportSource => ({
    name: file.getName(),
    size: file.getSize(),
    read: () => deviceFileRepository.read(file),
  });
}

/**
 * Deletes the user's original file once the library holds its own copy. Shared files belong to
 * the app that shared them and are never deleted. Resolves whether it was deleted.
 */
export function deleteOriginal({ deviceFileRepository }: DeviceFilesProps) {
  return async (file: DeviceFile): Promise<boolean> =>
    file.canDeleteOriginal() ? deviceFileRepository.delete(file) : false;
}

export function pickComicsFolder({ deviceFileRepository }: DeviceFilesProps) {
  return (): Promise<ComicsFolder | null> => deviceFileRepository.pickFolder();
}

export function pickDeviceFiles({ deviceFileRepository }: DeviceFilesProps) {
  return (): Promise<DeviceFile[]> => deviceFileRepository.pickFiles();
}

export function takeReceivedFiles({ deviceFileRepository }: DeviceFilesProps) {
  return (): Promise<DeviceFile[]> => deviceFileRepository.takeReceivedFiles();
}

export function shareExportedFile({ deviceFileRepository }: DeviceFilesProps) {
  return (file: ExportedFile, title: string): Promise<void> =>
    deviceFileRepository.share(file, title);
}

export function saveExportedFile({ deviceFileRepository }: DeviceFilesProps) {
  return (file: ExportedFile, folderUri: string): Promise<void> =>
    deviceFileRepository.saveToFolder(file, folderUri);
}
