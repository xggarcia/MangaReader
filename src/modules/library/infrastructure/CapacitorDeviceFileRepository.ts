import {
  DeviceFiles,
  readDeviceFile,
  type NativeDeviceFile,
} from '../../../shared/infrastructure/deviceFiles';
import { DeviceFile } from '../domain/DeviceFile';
import type {
  ComicsFolder,
  DeviceFileRepository,
  ExportedFile,
} from '../domain/DeviceFileRepository';
import { LibraryError } from '../domain/LibraryError';

function toDeviceFile(file: NativeDeviceFile): DeviceFile {
  return DeviceFile.create({
    uri: file.uri,
    name: file.name || 'file',
    size: Math.max(0, file.size || 0),
    modified: file.modified || 0,
    folder: file.folder || '',
    received: file.received === true,
  });
}

function isStorageFull(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'STORAGE_FULL';
}

/** Android Storage Access Framework through the local DeviceFiles plugin. */
export class CapacitorDeviceFileRepository implements DeviceFileRepository {
  async pickFolder(): Promise<ComicsFolder | null> {
    const { uri, name } = await DeviceFiles.pickFolder();
    return uri ? { uri, name: name || uri } : null;
  }

  async listFolder(folderUri: string): Promise<DeviceFile[]> {
    const { files } = await DeviceFiles.listFolder({ uri: folderUri });
    return files.map(toDeviceFile);
  }

  async pickFiles(): Promise<DeviceFile[]> {
    const { files } = await DeviceFiles.pickFiles();
    return files.map(toDeviceFile);
  }

  async takeReceivedFiles(): Promise<DeviceFile[]> {
    const { files } = await DeviceFiles.takeReceivedFiles();
    return files.map(toDeviceFile);
  }

  read(file: DeviceFile): Promise<Blob> {
    return readDeviceFile(file.getUri());
  }

  async delete(file: DeviceFile): Promise<boolean> {
    const { deleted } = await DeviceFiles.deleteFile({ uri: file.getUri() });
    return deleted;
  }

  share(file: ExportedFile, title: string): Promise<void> {
    return DeviceFiles.shareExport({ path: file.path, title });
  }

  async saveToFolder(file: ExportedFile, folderUri: string): Promise<void> {
    try {
      await DeviceFiles.saveExportToFolder({ path: file.path, folderUri });
    } catch (error) {
      if (isStorageFull(error)) {
        throw new LibraryError('quotaExceeded', '[CapacitorDeviceFileRepository] Storage is full');
      }
      throw error;
    }
  }
}
