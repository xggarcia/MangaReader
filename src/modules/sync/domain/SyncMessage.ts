import type { SyncEntryPrimitive } from './SyncEntry';
import type { OfferedCollection, OfferedComic } from './TransferOffer';

export const SYNC_PROTOCOL_VERSION = 1;

export interface SyncCover {
  /** Comic id on the device that sends the cover. */
  id: string;
  type: string;
  /** Image bytes, base64. */
  data: string;
}

/**
 * Messages of one sync session. Both devices send their manifest, ask for the covers they lack,
 * send the covers they were asked for, and close once both directions are done.
 */
export type SyncMessage =
  | { type: 'manifest'; version: number; entries: SyncEntryPrimitive[] }
  | { type: 'covers-request'; ids: string[] }
  | { type: 'covers'; items: SyncCover[] }
  | { type: 'covers-end' }
  // Sending comics: the offer, the ones the other device lacks, and each one once imported
  // (the files themselves travel as binary frames between these messages).
  | { type: 'offer'; comics: OfferedComic[]; collection: OfferedCollection | null }
  | { type: 'offer-reply'; wanted: string[] }
  | { type: 'comic-imported'; id: string; ok: boolean }
  | { type: 'send-done' };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Parses a message from the other device; `null` when it is not one this version understands. */
export function parseSyncMessage(json: string): SyncMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isObject(value)) return null;
  switch (value.type) {
    case 'manifest':
      return Array.isArray(value.entries) && typeof value.version === 'number'
        ? (value as SyncMessage)
        : null;
    case 'covers-request':
      return Array.isArray(value.ids) ? (value as SyncMessage) : null;
    case 'covers':
      return Array.isArray(value.items) ? (value as SyncMessage) : null;
    case 'covers-end':
      return { type: 'covers-end' };
    case 'offer':
      return Array.isArray(value.comics) ? (value as SyncMessage) : null;
    case 'offer-reply':
      return Array.isArray(value.wanted) ? (value as SyncMessage) : null;
    case 'comic-imported':
      return typeof value.id === 'string' ? (value as SyncMessage) : null;
    case 'send-done':
      return { type: 'send-done' };
    default:
      return null;
  }
}
