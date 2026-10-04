import type { DeviceFile } from './DeviceFile';

export interface ComicsFolder {
  uri: string;
  name: string;
}

/** Where an exported library file was written, ready to be shared or saved. */
export interface ExportedFile {
  path: string;
  fileName: string;
  size: number;
}

/**
 * The user's own files, reached through the system pickers (no broad storage permission):
 * the comics folder, picked files, files opened with or shared to the app.
 */
export interface DeviceFileRepository {
  /** `null` when the user cancels. */
  pickFolder(): Promise<ComicsFolder | null>;
  /** Comic archives and library exports in the folder and its sub-folders. */
  listFolder(folderUri: string): Promise<DeviceFile[]>;
  pickFiles(): Promise<DeviceFile[]>;
  /** Files opened with the app or shared to it since the last call. */
  takeReceivedFiles(): Promise<DeviceFile[]>;
  read(file: DeviceFile): Promise<Blob>;
  /** `false` when the location does not allow it; the file then stays. */
  delete(file: DeviceFile): Promise<boolean>;
  /** Opens the system share sheet (Quick Share, Bluetooth…) for an exported library. */
  share(file: ExportedFile, title: string): Promise<void>;
  saveToFolder(file: ExportedFile, folderUri: string): Promise<void>;
}
