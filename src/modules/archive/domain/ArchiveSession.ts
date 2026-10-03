import { ArchiveFormat, type ArchiveFormatPrimitive } from './ArchiveFormat';

export interface ArchiveSessionPrimitive {
  id: string;
  format: ArchiveFormatPrimitive;
  entryPaths: string[];
}

/** An archive opened by an ArchiveRepository, with the raw list of entries it contains. */
export class ArchiveSession {
  private constructor(
    private readonly id: string,
    private readonly format: ArchiveFormat,
    private readonly entryPaths: readonly string[],
  ) {}

  static create(props: {
    id: string;
    format: ArchiveFormat;
    entryPaths: readonly string[];
  }): ArchiveSession {
    if (props.id.trim() === '') throw new Error('[ArchiveSession] id must not be empty');
    return new ArchiveSession(props.id, props.format, [...props.entryPaths]);
  }

  static fromPrimitive(data: ArchiveSessionPrimitive): ArchiveSession {
    return ArchiveSession.create({
      id: data.id,
      format: ArchiveFormat.fromPrimitive(data.format),
      entryPaths: data.entryPaths,
    });
  }

  getId(): string {
    return this.id;
  }

  getFormat(): ArchiveFormat {
    return this.format;
  }

  getEntryPaths(): string[] {
    return [...this.entryPaths];
  }

  toPrimitive(): ArchiveSessionPrimitive {
    return { id: this.id, format: this.format.toPrimitive(), entryPaths: [...this.entryPaths] };
  }

  equals(other: ArchiveSession): boolean {
    return this.id === other.id;
  }
}
