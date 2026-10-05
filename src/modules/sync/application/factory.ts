import { getDb } from '../../../shared/infrastructure/db';
import { getLibraryUseCases } from '../../library/application/factory';
import type { ImportResult, ImportSource } from '../../library/application/importComics';
import type { CollectionRepository } from '../../library/domain/CollectionRepository';
import type { ComicRepository } from '../../library/domain/ComicRepository';
import type { CoverRepository } from '../../library/domain/CoverRepository';
import { IdbCollectionRepository } from '../../library/infrastructure/IdbCollectionRepository';
import { IdbComicRepository } from '../../library/infrastructure/IdbComicRepository';
import { IdbCoverRepository } from '../../library/infrastructure/IdbCoverRepository';
import { getProgressRepository } from '../../reading/application/factory';
import type { ProgressRepository } from '../../reading/domain/ProgressRepository';
import type { SyncTransportRepository } from '../domain/SyncTransportRepository';
import { CapacitorSyncTransportRepository } from '../infrastructure/CapacitorSyncTransportRepository';
import { SyncSession, type SyncSessionDependencies } from './SyncSession';
import {
  ReceiveSession,
  SendSession,
  type ReceiveProgress,
  type ReceiveResult,
  type SendProgress,
  type SendResult,
} from './TransferSessions';
import {
  answerOffer,
  buildOffer,
  importReceivedComic,
  receiveCollection,
  type Offer,
} from './transferComics';
import {
  applySyncManifest,
  buildSyncManifest,
  readSyncCovers,
  saveSyncCovers,
} from './syncLibrary';

interface SyncDependencies {
  comicRepository: ComicRepository;
  readComicFile: (comicId: string) => Promise<Blob | null>;
  collectionRepository: CollectionRepository;
  importComics: (sources: readonly ImportSource[]) => Promise<ImportResult[]>;
  coverRepository: CoverRepository;
  progressRepository: ProgressRepository;
  transport: SyncTransportRepository;
}

export function createSyncUseCases({
  comicRepository,
  readComicFile,
  collectionRepository,
  importComics,
  coverRepository,
  progressRepository,
  transport,
}: SyncDependencies) {
  const library = {
    buildManifest: buildSyncManifest({ comicRepository, progressRepository }),
    applyManifest: applySyncManifest({ comicRepository, progressRepository }),
    readCovers: readSyncCovers({ coverRepository }),
    saveCovers: saveSyncCovers({ comicRepository, coverRepository }),
  };
  const transfer = {
    answerOffer: answerOffer({ comicRepository }),
    importComic: importReceivedComic({ importComics, comicRepository, progressRepository }),
    receiveCollection: receiveCollection({ comicRepository, collectionRepository }),
  };
  return {
    getState: () => transport.getState(),
    /** Listen and advertise on the local network while the app is in the foreground. */
    start: () => transport.start(),
    stop: () => transport.stop(),
    syncNow: () => transport.syncNow(),
    setPairingMode: (enabled: boolean) => transport.setPairingMode(enabled),
    requestPairing: (deviceId: string) => transport.requestPairing(deviceId),
    confirmPairing: (accept: boolean) => transport.confirmPairing(accept),
    unpair: (deviceId: string) => transport.unpair(deviceId),
    onEvent: (listener: Parameters<SyncTransportRepository['onEvent']>[0]) =>
      transport.onEvent(listener),
    buildOffer: buildOffer({ comicRepository, progressRepository, collectionRepository }),
    /** Asks a paired device on the network for a send session (answered by sessionOpened). */
    openSendSession: (deviceId: string, requestId: string) =>
      transport.openSendSession(deviceId, requestId),
    createSendSession: (
      sessionId: string,
      offer: Offer,
      callbacks: {
        onProgress: (progress: SendProgress) => void;
        onFinished: (result: SendResult) => void;
      },
    ): SendSession =>
      new SendSession(
        {
          send: (message) => transport.send(sessionId, message),
          sendFile: (fileId, file, onBytes) => transport.sendFile(sessionId, fileId, file, onBytes),
          close: () => transport.closeSession(sessionId),
          readFile: readComicFile,
          ...callbacks,
        },
        offer,
      ),
    createReceiveSession: (
      sessionId: string,
      callbacks: {
        onProgress: (progress: ReceiveProgress) => void;
        onFinished: (result: ReceiveResult) => void;
      },
    ): ReceiveSession =>
      new ReceiveSession({
        send: (message) => transport.send(sessionId, message),
        close: () => transport.closeSession(sessionId),
        answerOffer: transfer.answerOffer,
        takeFile: (path) => transport.takeReceivedFile(path),
        importComic: transfer.importComic,
        receiveCollection: (offer) =>
          offer.collection
            ? transfer.receiveCollection(offer.collection, offer.comics)
            : Promise.resolve(),
        ...callbacks,
      }),
    /** A sync session over an open connection with a paired device. */
    createSession: (
      sessionId: string,
      onFinished: SyncSessionDependencies['onFinished'],
    ): SyncSession =>
      new SyncSession({
        ...library,
        send: (message) => transport.send(sessionId, message),
        close: () => transport.closeSession(sessionId),
        onFinished,
      }),
  };
}

export type SyncUseCases = ReturnType<typeof createSyncUseCases>;

let instance: SyncUseCases | null = null;

export function getSyncUseCases(): SyncUseCases {
  instance ??= createSyncUseCases({
    comicRepository: new IdbComicRepository(getDb),
    readComicFile: (comicId) => getLibraryUseCases().getComicFile(comicId),
    collectionRepository: new IdbCollectionRepository(getDb),
    importComics: (sources) => getLibraryUseCases().importComics(sources),
    coverRepository: new IdbCoverRepository(getDb),
    progressRepository: getProgressRepository(),
    transport: new CapacitorSyncTransportRepository(),
  });
  return instance;
}
