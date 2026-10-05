import type { SyncEntryPrimitive } from '../domain/SyncEntry';
import { SYNC_PROTOCOL_VERSION, type SyncCover, type SyncMessage } from '../domain/SyncMessage';
import type { ApplyResult } from './syncLibrary';

const COVERS_PER_MESSAGE = 20;

export interface SyncSessionDependencies {
  send: (message: SyncMessage) => Promise<void>;
  close: () => Promise<void>;
  buildManifest: () => Promise<SyncEntryPrimitive[]>;
  applyManifest: (entries: readonly SyncEntryPrimitive[]) => Promise<ApplyResult>;
  readCovers: (ids: readonly string[]) => Promise<SyncCover[]>;
  saveCovers: (covers: readonly SyncCover[]) => Promise<void>;
  /** Called once when the session has finished both ways. */
  onFinished: (result: { changed: number }) => void;
}

/**
 * One sync with a paired device, symmetric on both sides: send our manifest, merge theirs and
 * ask for the covers we lack, answer their request, and close once both directions are done.
 * Messages are handled one at a time, in order.
 */
export class SyncSession {
  private changed = 0;
  private receivedManifest = false;
  private receivedCovers = false;
  private sentCovers = false;
  private finished = false;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly deps: SyncSessionDependencies) {}

  async start(): Promise<void> {
    const entries = await this.deps.buildManifest();
    await this.deps.send({ type: 'manifest', version: SYNC_PROTOCOL_VERSION, entries });
  }

  receive(message: SyncMessage): Promise<void> {
    this.queue = this.queue.then(() => this.handle(message)).catch(() => this.deps.close());
    return this.queue;
  }

  private async handle(message: SyncMessage): Promise<void> {
    switch (message.type) {
      case 'manifest': {
        const result = await this.deps.applyManifest(message.entries);
        this.changed += result.changed;
        this.receivedManifest = true;
        await this.deps.send({ type: 'covers-request', ids: result.coversWanted });
        if (result.coversWanted.length === 0) this.receivedCovers = true;
        break;
      }
      case 'covers-request': {
        for (let index = 0; index < message.ids.length; index += COVERS_PER_MESSAGE) {
          const items = await this.deps.readCovers(
            message.ids.slice(index, index + COVERS_PER_MESSAGE),
          );
          if (items.length > 0) await this.deps.send({ type: 'covers', items });
        }
        await this.deps.send({ type: 'covers-end' });
        this.sentCovers = true;
        break;
      }
      case 'covers':
        await this.deps.saveCovers(message.items);
        break;
      case 'covers-end':
        this.receivedCovers = true;
        break;
    }
    await this.finishIfDone();
  }

  private async finishIfDone(): Promise<void> {
    if (this.finished || !this.receivedManifest || !this.receivedCovers || !this.sentCovers) {
      return;
    }
    this.finished = true;
    this.deps.onFinished({ changed: this.changed });
    await this.deps.close();
  }
}
