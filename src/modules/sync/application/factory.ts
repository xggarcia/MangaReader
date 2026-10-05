import { getDb } from '../../../shared/infrastructure/db';
import type { ComicRepository } from '../../library/domain/ComicRepository';
import type { CoverRepository } from '../../library/domain/CoverRepository';
import { IdbComicRepository } from '../../library/infrastructure/IdbComicRepository';
import { IdbCoverRepository } from '../../library/infrastructure/IdbCoverRepository';
import { getProgressRepository } from '../../reading/application/factory';
import type { ProgressRepository } from '../../reading/domain/ProgressRepository';
import type { SyncTransportRepository } from '../domain/SyncTransportRepository';
import { CapacitorSyncTransportRepository } from '../infrastructure/CapacitorSyncTransportRepository';
import { SyncSession, type SyncSessionDependencies } from './SyncSession';
import {
  applySyncManifest,
  buildSyncManifest,
  readSyncCovers,
  saveSyncCovers,
} from './syncLibrary';

interface SyncDependencies {
  comicRepository: ComicRepository;
  coverRepository: CoverRepository;
  progressRepository: ProgressRepository;
  transport: SyncTransportRepository;
}

export function createSyncUseCases({
  comicRepository,
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
    coverRepository: new IdbCoverRepository(getDb),
    progressRepository: getProgressRepository(),
    transport: new CapacitorSyncTransportRepository(),
  });
  return instance;
}
