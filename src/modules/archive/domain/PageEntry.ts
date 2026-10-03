export interface PageEntryPrimitive {
  path: string;
}

const MIME_TYPES: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  bmp: 'image/bmp',
};

export const SUPPORTED_IMAGE_EXTENSIONS: readonly string[] = Object.keys(MIME_TYPES);

/** Files that are never pages even if their name looks harmless. */
const IGNORED_FILE_NAMES = new Set(['thumbs.db', 'desktop.ini', '.ds_store']);
const IGNORED_DIRECTORIES = new Set(['__macosx']);

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '');
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot <= 0 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/** An image file inside an archive that is shown as a page. */
export class PageEntry {
  private constructor(private readonly path: string) {}

  /** Whether an archive entry path should be shown as a page. */
  static isPagePath(rawPath: string): boolean {
    const path = normalizePath(rawPath);
    if (path === '' || path.endsWith('/')) return false;

    const segments = path.split('/');
    const fileName = segments[segments.length - 1] ?? '';
    const directories = segments.slice(0, -1);

    if (
      directories.some((dir) => IGNORED_DIRECTORIES.has(dir.toLowerCase()) || dir.startsWith('.'))
    ) {
      return false;
    }
    // Hidden files, including macOS AppleDouble resource forks ("._001.jpg").
    if (fileName.startsWith('.') || IGNORED_FILE_NAMES.has(fileName.toLowerCase())) return false;

    return Object.hasOwn(MIME_TYPES, extensionOf(fileName));
  }

  static create(rawPath: string): PageEntry {
    if (!PageEntry.isPagePath(rawPath)) {
      throw new Error(`[PageEntry] Not a page image: ${rawPath}`);
    }
    return new PageEntry(rawPath);
  }

  static fromPrimitive(data: PageEntryPrimitive): PageEntry {
    return PageEntry.create(data.path);
  }

  /** Original entry path inside the archive, used to extract the file. */
  getPath(): string {
    return this.path;
  }

  getFileName(): string {
    const segments = normalizePath(this.path).split('/');
    return segments[segments.length - 1] ?? this.path;
  }

  getMimeType(): string {
    const extension = extensionOf(this.getFileName());
    return Object.hasOwn(MIME_TYPES, extension)
      ? (MIME_TYPES[extension] as string)
      : 'application/octet-stream';
  }

  /** Path segments used for natural ordering (folders first, then file name). */
  getSortSegments(): string[] {
    return normalizePath(this.path).split('/');
  }

  toPrimitive(): PageEntryPrimitive {
    return { path: this.path };
  }

  equals(other: PageEntry): boolean {
    return this.path === other.path;
  }
}
