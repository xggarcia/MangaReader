import type { PluginListenerHandle } from '@capacitor/core';
import {
  DeviceFiles,
  readCacheFile,
  streamBlobToNative,
} from '../../../shared/infrastructure/deviceFiles';
import { LocalSync } from '../../../shared/infrastructure/localSync';
import { parseSyncMessage, type SyncMessage } from '../domain/SyncMessage';
import type {
  PairedDevice,
  SyncTransportEvent,
  SyncTransportRepository,
} from '../domain/SyncTransportRepository';

/** The LocalSync Android plugin: NSD discovery, ECDH pairing and AES-GCM sessions over TCP. */
export class CapacitorSyncTransportRepository implements SyncTransportRepository {
  async getState(): Promise<{ deviceName: string; peers: PairedDevice[] }> {
    const { deviceName, peers } = await LocalSync.getState();
    return { deviceName, peers };
  }

  start(): Promise<void> {
    return LocalSync.start();
  }

  stop(): Promise<void> {
    return LocalSync.stop();
  }

  syncNow(): Promise<void> {
    return LocalSync.syncNow();
  }

  setPairingMode(enabled: boolean): Promise<void> {
    return LocalSync.setPairingMode({ enabled });
  }

  requestPairing(deviceId: string): Promise<void> {
    return LocalSync.requestPairing({ id: deviceId });
  }

  confirmPairing(accept: boolean): Promise<void> {
    return LocalSync.confirmPairing({ accept });
  }

  unpair(deviceId: string): Promise<void> {
    return LocalSync.unpair({ id: deviceId });
  }

  send(sessionId: string, message: SyncMessage): Promise<void> {
    return LocalSync.send({ sessionId, data: JSON.stringify(message) });
  }

  openSendSession(deviceId: string, requestId: string): Promise<void> {
    return LocalSync.openSendSession({ peerId: deviceId, requestId });
  }

  async sendFile(
    sessionId: string,
    fileId: string,
    file: Blob,
    onBytes?: (bytes: number) => void,
  ): Promise<void> {
    await LocalSync.beginOutgoingFile({ sessionId, fileId });
    await streamBlobToNative(
      file,
      (data) => LocalSync.writeOutgoingFile({ sessionId, data }),
      onBytes,
    );
    await LocalSync.endOutgoingFile({ sessionId });
  }

  async takeReceivedFile(path: string): Promise<Blob> {
    try {
      return await readCacheFile(path);
    } finally {
      void DeviceFiles.deleteCacheFile({ path });
    }
  }

  closeSession(sessionId: string): Promise<void> {
    return LocalSync.closeSession({ sessionId });
  }

  onEvent(listener: (event: SyncTransportEvent) => void): () => void {
    const handles: Promise<PluginListenerHandle>[] = [
      LocalSync.addListener('pairingCandidates', ({ candidates }) =>
        listener({ type: 'pairingCandidates', candidates }),
      ),
      LocalSync.addListener('pairingCode', ({ code, peerName }) =>
        listener({ type: 'pairingCode', code, peerName }),
      ),
      LocalSync.addListener('paired', (device) =>
        listener({ type: 'paired', device: { id: device.id, name: device.name } }),
      ),
      LocalSync.addListener('pairingFailed', ({ reason }) =>
        listener({ type: 'pairingFailed', reason }),
      ),
      LocalSync.addListener('sessionOpened', (event) =>
        listener({
          type: 'sessionOpened',
          sessionId: event.sessionId,
          peer: { id: event.peerId, name: event.peerName },
          purpose: event.purpose === 'send' ? 'send' : 'sync',
          initiator: event.initiator,
          requestId: event.requestId ?? null,
        }),
      ),
      LocalSync.addListener('sessionFailed', ({ requestId }) =>
        listener({ type: 'sessionFailed', requestId }),
      ),
      LocalSync.addListener('fileReceived', ({ sessionId, fileId, path }) =>
        listener({ type: 'fileReceived', sessionId, fileId, path }),
      ),
      LocalSync.addListener('fileProgress', ({ sessionId, fileId, received }) =>
        listener({ type: 'fileProgress', sessionId, fileId, received }),
      ),
      LocalSync.addListener('sessionMessage', ({ sessionId, data }) => {
        const message = parseSyncMessage(data);
        if (message) listener({ type: 'sessionMessage', sessionId, message });
      }),
      LocalSync.addListener('sessionClosed', ({ sessionId }) =>
        listener({ type: 'sessionClosed', sessionId }),
      ),
    ];
    return () => {
      for (const handle of handles) void handle.then((registered) => registered.remove());
    };
  }
}
