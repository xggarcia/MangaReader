export interface DeviceFilePrimitive {
  /** Storage Access Framework URI (content://…). */
  uri: string;
  name: string;
  size: number;
  /** Epoch milliseconds, 0 when unknown. */
  modified: number;
  /** Sub-folder inside the comics folder ("" at its root or outside it). */
  folder: string;
  /** Opened with the app or shared to it by another app. */
  received: boolean;
}

const COMIC_ARCHIVE = /\.(cbz|cbr|zip|rar)$/i;
const LIBRARY_EXPORT = /\.mangareader$/i;

/** A file on the device the user gave the app access to (comics folder, picker, share). */
export class DeviceFile {
  private constructor(private readonly data: Readonly<DeviceFilePrimitive>) {}

  static create(props: DeviceFilePrimitive): DeviceFile {
    if (props.uri.trim() === '') throw new Error('[DeviceFile] uri must not be empty');
    if (props.name.trim() === '') throw new Error('[DeviceFile] name must not be empty');
    if (!Number.isFinite(props.size) || props.size < 0) {
      throw new Error('[DeviceFile] size must be a non-negative number');
    }
    return new DeviceFile({ ...props });
  }

  static fromPrimitive(data: DeviceFilePrimitive): DeviceFile {
    return DeviceFile.create(data);
  }

  getUri(): string {
    return this.data.uri;
  }

  getName(): string {
    return this.data.name;
  }

  getSize(): number {
    return this.data.size;
  }

  getFolder(): string {
    return this.data.folder;
  }

  isComicArchive(): boolean {
    return COMIC_ARCHIVE.test(this.data.name);
  }

  /** A whole library exported from MangaReader (to move it to another device). */
  isLibraryExport(): boolean {
    return LIBRARY_EXPORT.test(this.data.name);
  }

  /** Files another app shared belong to that app: only the user's own files are deleted. */
  canDeleteOriginal(): boolean {
    return !this.data.received;
  }

  toPrimitive(): DeviceFilePrimitive {
    return { ...this.data };
  }

  equals(other: DeviceFile): boolean {
    return this.data.uri === other.data.uri;
  }
}
