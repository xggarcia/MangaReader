export type ArchiveFormatPrimitive = 'zip' | 'rar';

const ZIP_SIGNATURES: readonly (readonly number[])[] = [
  [0x50, 0x4b, 0x03, 0x04], // local file header
  [0x50, 0x4b, 0x05, 0x06], // empty archive (end of central directory)
];
const RAR_SIGNATURE: readonly number[] = [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]; // "Rar!\x1A\x07" (RAR4 and RAR5)

/** Number of leading bytes needed to detect a format. */
export const ARCHIVE_SIGNATURE_LENGTH = 8;

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return bytes.length >= signature.length && signature.every((byte, i) => bytes[i] === byte);
}

/**
 * Container format of a comic archive, detected from magic bytes rather than the file
 * extension (many `.cbr` files are actually ZIP archives and vice versa).
 */
export class ArchiveFormat {
  private constructor(private readonly value: ArchiveFormatPrimitive) {}

  static zip(): ArchiveFormat {
    return new ArchiveFormat('zip');
  }

  static rar(): ArchiveFormat {
    return new ArchiveFormat('rar');
  }

  /** Returns the detected format, or `null` when the header matches no supported format. */
  static detect(header: Uint8Array): ArchiveFormat | null {
    if (ZIP_SIGNATURES.some((signature) => startsWith(header, signature)))
      return ArchiveFormat.zip();
    if (startsWith(header, RAR_SIGNATURE)) return ArchiveFormat.rar();
    return null;
  }

  static fromPrimitive(data: ArchiveFormatPrimitive): ArchiveFormat {
    if (data !== 'zip' && data !== 'rar') {
      throw new Error(`[ArchiveFormat] Unknown archive format: ${String(data)}`);
    }
    return new ArchiveFormat(data);
  }

  isZip(): boolean {
    return this.value === 'zip';
  }

  isRar(): boolean {
    return this.value === 'rar';
  }

  toPrimitive(): ArchiveFormatPrimitive {
    return this.value;
  }

  equals(other: ArchiveFormat): boolean {
    return this.value === other.value;
  }
}
