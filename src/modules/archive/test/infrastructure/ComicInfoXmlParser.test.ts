import { describe, expect, it } from 'vitest';
import { parseComicInfoXml } from '../../infrastructure/ComicInfoXmlParser';

const comicInfo = (fields: string) =>
  `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
${fields}
</ComicInfo>`;

describe('parseComicInfoXml', () => {
  it('reads title, series, number and writer', () => {
    const info = parseComicInfoXml(
      comicInfo(`
        <Title>The Long Night</Title>
        <Series>Moon Knights</Series>
        <Number>12</Number>
        <Writer>Ana García</Writer>
        <Penciller>Someone Else</Penciller>
        <PageCount>24</PageCount>`),
    );

    expect(info?.toPrimitive()).toEqual({
      title: 'The Long Night',
      series: 'Moon Knights',
      number: '12',
      writer: 'Ana García',
    });
  });

  it('keeps numbers as written (leading zeros and decimals)', () => {
    expect(parseComicInfoXml(comicInfo('<Number>007</Number>'))?.getNumber()).toBe('007');
    expect(parseComicInfoXml(comicInfo('<Number>12.5</Number>'))?.getNumber()).toBe('12.5');
  });

  it('returns null fields for missing or blank values', () => {
    const info = parseComicInfoXml(comicInfo('<Series>Only Series</Series><Title>   </Title>'));

    expect(info?.getSeries()).toBe('Only Series');
    expect(info?.getTitle()).toBeNull();
    expect(info?.getNumber()).toBeNull();
    expect(info?.getWriter()).toBeNull();
  });

  it('decodes XML entities and trims whitespace', () => {
    const info = parseComicInfoXml(comicInfo('<Title>\n  Tom &amp; Jerry &lt;3  \n</Title>'));

    expect(info?.getTitle()).toBe('Tom & Jerry <3');
  });

  it('ignores a UTF-8 byte order mark', () => {
    const info = parseComicInfoXml(
      `${String.fromCharCode(0xfeff)}${comicInfo('<Title>With BOM</Title>')}`,
    );

    expect(info?.getTitle()).toBe('With BOM');
  });

  it('returns null when no useful field is present', () => {
    expect(parseComicInfoXml(comicInfo('<PageCount>24</PageCount>'))).toBeNull();
    expect(parseComicInfoXml('<ComicInfo/>')).toBeNull();
  });

  it('returns null for another root element', () => {
    expect(parseComicInfoXml('<Book><Title>Not a comic</Title></Book>')).toBeNull();
  });

  it('returns null for malformed or non-XML content', () => {
    expect(parseComicInfoXml('<ComicInfo><Title>Broken</ComicInfo>')).toBeNull();
    expect(parseComicInfoXml('this is not xml')).toBeNull();
    expect(parseComicInfoXml('')).toBeNull();
  });
});
