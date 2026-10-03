import { describe, expect, it } from 'vitest';
import { ArchiveFormat } from '../../domain/ArchiveFormat';

const bytes = (...values: number[]) => new Uint8Array(values);

describe('ArchiveFormat.detect', () => {
  it('detects ZIP archives from the local file header', () => {
    expect(ArchiveFormat.detect(bytes(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00))?.isZip()).toBe(true);
  });

  it('detects empty ZIP archives', () => {
    expect(ArchiveFormat.detect(bytes(0x50, 0x4b, 0x05, 0x06, 0x00, 0x00))?.isZip()).toBe(true);
  });

  it('detects RAR4 archives', () => {
    expect(ArchiveFormat.detect(bytes(0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00))?.isRar()).toBe(
      true,
    );
  });

  it('detects RAR5 archives', () => {
    expect(
      ArchiveFormat.detect(bytes(0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00))?.isRar(),
    ).toBe(true);
  });

  it('returns null for other formats', () => {
    const pdf = bytes(0x25, 0x50, 0x44, 0x46, 0x2d);
    const sevenZip = bytes(0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c);

    expect(ArchiveFormat.detect(pdf)).toBeNull();
    expect(ArchiveFormat.detect(sevenZip)).toBeNull();
  });

  it('returns null when the header is too short', () => {
    expect(ArchiveFormat.detect(bytes(0x50, 0x4b))).toBeNull();
    expect(ArchiveFormat.detect(bytes())).toBeNull();
  });
});
