import { describe, expect, it } from 'vitest';
import { PageList } from '../../domain/PageList';

const pathsOf = (list: PageList) => list.toArray().map((page) => page.getPath());

describe('PageList', () => {
  describe('natural ordering', () => {
    it('orders numbered pages numerically, not lexicographically', () => {
      const list = PageList.fromEntryPaths(['page10.jpg', 'page2.jpg', 'page1.jpg', 'page11.jpg']);

      expect(pathsOf(list)).toEqual(['page1.jpg', 'page2.jpg', 'page10.jpg', 'page11.jpg']);
    });

    it('handles zero-padded and unpadded numbers together', () => {
      const list = PageList.fromEntryPaths(['010.png', '9.png', '001.png', '100.png']);

      expect(pathsOf(list)).toEqual(['001.png', '9.png', '010.png', '100.png']);
    });

    it('ignores letter case when ordering', () => {
      const list = PageList.fromEntryPaths(['B.jpg', 'a.jpg', 'C.jpg']);

      expect(pathsOf(list)).toEqual(['a.jpg', 'B.jpg', 'C.jpg']);
    });

    it('orders chapter folders naturally and keeps pages inside each folder in order', () => {
      const list = PageList.fromEntryPaths([
        'Chapter 10/2.jpg',
        'Chapter 2/10.jpg',
        'Chapter 10/1.jpg',
        'Chapter 2/2.jpg',
      ]);

      expect(pathsOf(list)).toEqual([
        'Chapter 2/2.jpg',
        'Chapter 2/10.jpg',
        'Chapter 10/1.jpg',
        'Chapter 10/2.jpg',
      ]);
    });

    it('puts root-level files before sub-folders', () => {
      const list = PageList.fromEntryPaths(['ch1/001.jpg', 'cover.jpg']);

      expect(pathsOf(list)).toEqual(['cover.jpg', 'ch1/001.jpg']);
    });

    it('removes duplicated entries', () => {
      const list = PageList.fromEntryPaths(['1.jpg', '1.jpg', '2.jpg']);

      expect(list.count()).toBe(2);
    });
  });

  describe('file filtering', () => {
    it('keeps supported image formats regardless of extension case', () => {
      const list = PageList.fromEntryPaths([
        'a.jpg',
        'b.JPEG',
        'c.png',
        'd.webp',
        'e.gif',
        'f.avif',
        'g.bmp',
      ]);

      expect(list.count()).toBe(7);
    });

    it('ignores macOS metadata folders and AppleDouble files', () => {
      const list = PageList.fromEntryPaths([
        '__MACOSX/._001.jpg',
        '__MACOSX/ch1/002.jpg',
        '._003.jpg',
        '004.jpg',
      ]);

      expect(pathsOf(list)).toEqual(['004.jpg']);
    });

    it('ignores system and hidden files', () => {
      const list = PageList.fromEntryPaths([
        'Thumbs.db',
        '.DS_Store',
        'desktop.ini',
        '.hidden/001.jpg',
        '.cover.jpg',
        '001.jpg',
      ]);

      expect(pathsOf(list)).toEqual(['001.jpg']);
    });

    it('ignores non-image files and directory entries', () => {
      const list = PageList.fromEntryPaths([
        'ComicInfo.xml',
        'readme.txt',
        'credits.nfo',
        'scans/',
        'noextension',
        'scans/001.jpg',
      ]);

      expect(pathsOf(list)).toEqual(['scans/001.jpg']);
    });

    it('accepts Windows-style separators', () => {
      const list = PageList.fromEntryPaths(['__MACOSX\\001.jpg', 'ch1\\001.jpg']);

      expect(pathsOf(list)).toEqual(['ch1\\001.jpg']);
    });

    it('is empty when the archive has no images', () => {
      const list = PageList.fromEntryPaths(['ComicInfo.xml', 'Thumbs.db']);

      expect(list.isEmpty()).toBe(true);
    });
  });

  it('keeps the original entry path and exposes the image MIME type', () => {
    const page = PageList.fromEntryPaths(['Vol 1\\P001.JPG']).at(0);

    expect(page.getPath()).toBe('Vol 1\\P001.JPG');
    expect(page.getFileName()).toBe('P001.JPG');
    expect(page.getMimeType()).toBe('image/jpeg');
  });

  it('round-trips through primitives', () => {
    const list = PageList.fromEntryPaths(['2.png', '1.png']);

    expect(PageList.fromPrimitive(list.toPrimitive()).equals(list)).toBe(true);
  });
});
