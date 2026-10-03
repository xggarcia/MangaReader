import { describe, expect, it } from 'vitest';
import { ComicInfo } from '../../domain/ComicInfo';

describe('ComicInfo.locateIn', () => {
  it('finds ComicInfo.xml regardless of letter case', () => {
    expect(ComicInfo.locateIn(['001.jpg', 'comicinfo.XML'])).toBe('comicinfo.XML');
  });

  it('prefers the file closest to the root', () => {
    expect(ComicInfo.locateIn(['Vol 1/ComicInfo.xml', 'ComicInfo.xml'])).toBe('ComicInfo.xml');
  });

  it('ignores macOS metadata copies', () => {
    expect(ComicInfo.locateIn(['__MACOSX/ComicInfo.xml', 'Vol 1/ComicInfo.xml'])).toBe(
      'Vol 1/ComicInfo.xml',
    );
  });

  it('returns null when the archive has no ComicInfo.xml', () => {
    expect(ComicInfo.locateIn(['001.jpg', 'MyComicInfo.xml.bak'])).toBeNull();
  });
});

describe('ComicInfo', () => {
  it('normalizes blank values to null', () => {
    const info = ComicInfo.create({ title: '  ', series: ' Series ' });

    expect(info.toPrimitive()).toEqual({
      title: null,
      series: 'Series',
      number: null,
      writer: null,
    });
    expect(info.isEmpty()).toBe(false);
    expect(ComicInfo.create({}).isEmpty()).toBe(true);
  });
});
