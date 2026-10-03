import { XMLParser } from 'fast-xml-parser';
import { ComicInfo } from '../domain/ComicInfo';

// Values are kept as strings ("007" must stay "007"); attributes are not needed.
const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
});

// Written as a char code: a literal U+FEFF in source is invisible and easy to break.
const BYTE_ORDER_MARK = new RegExp(`^${String.fromCharCode(0xfeff)}`);

function textOf(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return null;
}

/**
 * Parses ComicInfo.xml content. Works without DOM APIs so it can run inside a Web Worker.
 * Returns `null` for malformed XML, a different root element or a file with no useful fields.
 */
export function parseComicInfoXml(xml: string): ComicInfo | null {
  let document: unknown;
  try {
    document = parser.parse(xml.replace(BYTE_ORDER_MARK, ''), true);
  } catch {
    return null;
  }
  if (!document || typeof document !== 'object') return null;

  const root = (document as Record<string, unknown>)['ComicInfo'];
  if (!root || typeof root !== 'object') return null;
  const fields = root as Record<string, unknown>;

  const info = ComicInfo.create({
    title: textOf(fields['Title']),
    series: textOf(fields['Series']),
    number: textOf(fields['Number']),
    writer: textOf(fields['Writer']),
  });
  return info.isEmpty() ? null : info;
}
