import type { SyncMessage } from '../domain/SyncMessage';
import type { OfferedComic } from '../domain/TransferOffer';
import type { Offer } from './transferComics';

export type SendProgress =
  | { phase: 'checking' }
  | {
      phase: 'sending';
      /** Comics finished (imported there or failed), out of `total`. */
      done: number;
      total: number;
      alreadyThere: number;
      bytesDone: number;
      bytesTotal: number;
      title: string;
    };

export interface SendResult {
  sent: number;
  alreadyThere: number;
  failed: number;
  /** The connection dropped before everything was sent. */
  interrupted: boolean;
}

interface SendSessionDependencies {
  send: (message: SyncMessage) => Promise<void>;
  sendFile: (fileId: string, file: Blob, onBytes: (bytes: number) => void) => Promise<void>;
  close: () => Promise<void>;
  readFile: (comicId: string) => Promise<Blob | null>;
  onProgress: (progress: SendProgress) => void;
  onFinished: (result: SendResult) => void;
}

/**
 * Sends comics to a paired device: offers them, sends only the ones it lacks, one at a time,
 * waiting until each one is imported there before the next.
 */
export class SendSession {
  private pendingImport: ((ok: boolean) => void) | null = null;
  private finished = false;
  private result: SendResult = { sent: 0, alreadyThere: 0, failed: 0, interrupted: false };

  constructor(
    private readonly deps: SendSessionDependencies,
    private readonly offer: Offer,
  ) {}

  async start(): Promise<void> {
    this.deps.onProgress({ phase: 'checking' });
    await this.deps.send({
      type: 'offer',
      comics: this.offer.comics,
      collection: this.offer.collection,
    });
  }

  receive(message: SyncMessage): void {
    if (message.type === 'offer-reply') void this.sendWanted(message.wanted);
    if (message.type === 'comic-imported') {
      this.pendingImport?.(message.ok);
      this.pendingImport = null;
    }
  }

  /** The connection closed: whatever was still pending did not arrive. */
  closed(): void {
    this.pendingImport?.(false);
    this.pendingImport = null;
    this.finish(true);
  }

  private async sendWanted(wanted: readonly string[]): Promise<void> {
    const ids = new Set(wanted);
    const comics = this.offer.comics.filter((comic) => ids.has(comic.id));
    const alreadyThere = this.offer.comics.length - comics.length;
    const bytesTotal = comics.reduce((total, comic) => total + comic.storedSize, 0);
    this.result.alreadyThere = alreadyThere;
    let bytesDone = 0;
    let done = 0;
    const progress = (title: string) =>
      this.deps.onProgress({
        phase: 'sending',
        done,
        total: comics.length,
        alreadyThere,
        bytesDone,
        bytesTotal,
        title,
      });

    try {
      for (const comic of comics) {
        progress(comic.title);
        const file = await this.deps.readFile(comic.id);
        if (!file) {
          this.result.failed++;
          done++;
          continue;
        }
        const imported = new Promise<boolean>((resolve) => (this.pendingImport = resolve));
        await this.deps.sendFile(comic.id, file, (bytes) => {
          bytesDone += bytes;
          progress(comic.title);
        });
        if (await imported) this.result.sent++;
        else this.result.failed++;
        done++;
        if (this.finished) return;
      }
      await this.deps.send({ type: 'send-done' });
      this.finish(false);
      await this.deps.close();
    } catch {
      this.finish(true);
      await this.deps.close().catch(() => undefined);
    }
  }

  private finish(interrupted: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.deps.onFinished({ ...this.result, interrupted });
  }
}

export interface ReceiveProgress {
  done: number;
  total: number;
  title: string;
}

export interface ReceiveResult {
  received: number;
  failed: number;
}

interface ReceiveSessionDependencies {
  send: (message: SyncMessage) => Promise<void>;
  close: () => Promise<void>;
  answerOffer: (comics: readonly OfferedComic[]) => Promise<string[]>;
  takeFile: (path: string) => Promise<Blob>;
  importComic: (offered: OfferedComic, file: Blob) => Promise<boolean>;
  receiveCollection: (offer: Offer) => Promise<void>;
  onProgress: (progress: ReceiveProgress) => void;
  onFinished: (result: ReceiveResult) => void;
}

/**
 * Receives comics from a paired device: answers which ones are missing here, imports each file
 * as it arrives and confirms it, and completes the collection they were sent as.
 */
export class ReceiveSession {
  private offer: Offer | null = null;
  private wanted: string[] = [];
  private result: ReceiveResult = { received: 0, failed: 0 };
  private finished = false;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly deps: ReceiveSessionDependencies) {}

  receive(message: SyncMessage): void {
    this.enqueue(async () => {
      if (message.type === 'offer') {
        this.offer = { comics: message.comics, collection: message.collection };
        this.wanted = await this.deps.answerOffer(message.comics);
        await this.deps.send({ type: 'offer-reply', wanted: this.wanted });
        this.progress('');
      }
      if (message.type === 'send-done') {
        if (this.offer?.collection) await this.deps.receiveCollection(this.offer);
        this.finish();
        await this.deps.close();
      }
    });
  }

  fileReceived(fileId: string, path: string): void {
    this.enqueue(async () => {
      const offered = this.offer?.comics.find((comic) => comic.id === fileId);
      let ok = false;
      if (offered) {
        this.progress(offered.title);
        const file = await this.deps.takeFile(path);
        ok = await this.deps.importComic(offered, file).catch(() => false);
      }
      if (ok) this.result.received++;
      else this.result.failed++;
      this.progress(offered?.title ?? '');
      await this.deps.send({ type: 'comic-imported', id: fileId, ok });
    });
  }

  /** The connection closed: keep what arrived (after the messages already being handled). */
  closed(): void {
    this.enqueue(() => {
      this.finish();
      return Promise.resolve();
    });
  }

  private progress(title: string): void {
    this.deps.onProgress({
      done: this.result.received + this.result.failed,
      total: this.wanted.length,
      title,
    });
  }

  private enqueue(task: () => Promise<void>): void {
    this.queue = this.queue.then(task).catch(() => {
      void this.deps.close();
    });
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.deps.onFinished(this.result);
  }
}
