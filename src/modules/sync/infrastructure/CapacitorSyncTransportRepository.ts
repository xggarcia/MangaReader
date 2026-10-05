import type { PluginListenerHandle } from '@capacitor/core';
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
      LocalSync.addListener('sessionOpened', ({ sessionId, peerId, peerName }) =>
        listener({ type: 'sessionOpened', sessionId, peer: { id: peerId, name: peerName } }),
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
